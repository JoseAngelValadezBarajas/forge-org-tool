import json
import os
import subprocess
from pathlib import Path
from typing import Any

from forge_org.infrastructure.sqlite import OrganizationRepository, utc_now

OBSERVER_VERSION = 'forge-git-observer-v1'


class RepositoryService:
    def __init__(self, connection):
        self.repository = OrganizationRepository(connection)

    def _project(self, workspace_id: str, project_id: str) -> dict[str, Any]:
        project = self.repository.get_project(workspace_id, project_id)
        if project is None:
            raise LookupError('Project not found')
        return project

    @staticmethod
    def _allowed(path: Path) -> bool:
        raw = os.environ.get('FORGE_ALLOWED_REPOSITORY_ROOTS', '[]')
        try:
            roots = [Path(item).expanduser().resolve() for item in json.loads(raw)]
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            raise ValueError('Repository allowlist is invalid') from exc
        return any(path == root or root in path.parents for root in roots)

    @staticmethod
    def _git(root: Path, *args: str, check: bool = True) -> str:
        result = subprocess.run(
            ['git', '-C', str(root), *args],
            check=check,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
        )
        if check:
            return result.stdout.strip()
        return result.stdout.strip()

    def connect(self, workspace_id: str, project_id: str, root_path: str) -> dict[str, Any]:
        project = self._project(workspace_id, project_id)
        if project['status'] != 'active':
            raise ValueError('Archived projects are read-only')
        candidate = Path(root_path).expanduser().resolve()
        if not candidate.is_dir() or not self._allowed(candidate):
            raise ValueError('Repository path is outside the approved roots')
        try:
            canonical = Path(self._git(candidate, 'rev-parse', '--show-toplevel')).resolve()
        except (subprocess.CalledProcessError, FileNotFoundError) as exc:
            raise ValueError('Path is not a Git working tree') from exc
        if not self._allowed(canonical):
            raise ValueError('Repository root is outside the approved roots')
        try:
            return self.repository.create_repository(project_id, str(canonical))
        except Exception as exc:
            if 'UNIQUE' in str(exc).upper():
                raise ValueError('Repository is already connected') from exc
            raise

    def repositories(self, workspace_id: str, project_id: str) -> list[dict[str, Any]]:
        self._project(workspace_id, project_id)
        return self.repository.list_repositories(project_id)

    def _repository(self, workspace_id: str, project_id: str, repository_id: str) -> dict[str, Any]:
        self._project(workspace_id, project_id)
        item = self.repository.get_repository(project_id, repository_id)
        if item is None:
            raise LookupError('Repository not found')
        return item

    def disconnect(self, workspace_id: str, project_id: str, repository_id: str) -> dict[str, Any]:
        self._repository(workspace_id, project_id, repository_id)
        return self.repository.disconnect_repository(project_id, repository_id) or {}

    def observe(self, workspace_id: str, project_id: str, repository_id: str) -> dict[str, Any]:
        item = self._repository(workspace_id, project_id, repository_id)
        root = Path(item['root_path'])
        if not root.is_dir() or not self._allowed(root):
            raise ValueError('Repository is no longer inside the approved roots')
        try:
            head = self._git(root, 'rev-parse', '--verify', 'HEAD', check=False)
            branch = self._git(root, 'branch', '--show-current', check=False) or None
            porcelain = self._git(root, 'status', '--porcelain=v1', check=True)
            unborn = not bool(head)
            lines = [line for line in porcelain.splitlines() if line]
            staged = sum(1 for line in lines if line[0] not in (' ', '?'))
            modified = sum(1 for line in lines if line[1:2] not in ('', ' ', '?'))
            untracked = sum(1 for line in lines if line.startswith('??'))
            values = {
                'repository_id': repository_id,
                'observed_at': utc_now(),
                'head_sha': head or None,
                'branch': branch,
                'detached': bool(head and not branch),
                'unborn': unborn,
                'clean': not lines,
                'tracked_modified_count': modified,
                'staged_count': staged,
                'untracked_count': untracked,
                'observer_version': OBSERVER_VERSION,
                'status': 'ok',
            }
        except (subprocess.CalledProcessError, FileNotFoundError):
            values = {
                'repository_id': repository_id,
                'observed_at': utc_now(),
                'observer_version': OBSERVER_VERSION,
                'status': 'error',
                'error_code': 'GIT_OBSERVATION_FAILED',
            }
        return self.repository.create_observation(values)

    def observations(
        self, workspace_id: str, project_id: str, repository_id: str
    ) -> list[dict[str, Any]]:
        self._repository(workspace_id, project_id, repository_id)
        return self.repository.list_observations(repository_id)

    def link_feature(
        self, workspace_id: str, project_id: str, feature_id: str, repository_id: str
    ) -> dict[str, Any]:
        self._project(workspace_id, project_id)
        if self.repository.feature(project_id, feature_id) is None:
            raise LookupError('Feature not found')
        self._repository(workspace_id, project_id, repository_id)
        return self.repository.link_repository(feature_id, repository_id)

    def unlink_feature(
        self, workspace_id: str, project_id: str, feature_id: str, repository_id: str
    ) -> None:
        self._project(workspace_id, project_id)
        if self.repository.feature(project_id, feature_id) is None:
            raise LookupError('Feature not found')
        self._repository(workspace_id, project_id, repository_id)
        if not self.repository.unlink_repository(feature_id, repository_id):
            raise LookupError('Repository link not found')

    def feature_links(
        self, workspace_id: str, project_id: str, feature_id: str
    ) -> list[dict[str, Any]]:
        self._project(workspace_id, project_id)
        if self.repository.feature(project_id, feature_id) is None:
            raise LookupError('Feature not found')
        return self.repository.feature_repositories(feature_id)
