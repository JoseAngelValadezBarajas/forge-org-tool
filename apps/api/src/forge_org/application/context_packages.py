import hashlib
import json
import sqlite3
from typing import Any

from forge_org.infrastructure.persistence import OrganizationRepository

SCHEMA_VERSION = 'forge-context-v1'


class ContextPackageService:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.repository = OrganizationRepository(connection)

    def _scope(
        self, workspace_id: str, project_id: str, feature_id: str
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        project = self.repository.get_project(workspace_id, project_id)
        feature = self.repository.feature(project_id, feature_id)
        if project is None or feature is None:
            raise LookupError('Feature not found')
        return project, feature

    def _build(self, workspace_id: str, project_id: str, feature_id: str) -> dict[str, Any]:
        project, feature = self._scope(workspace_id, project_id, feature_id)
        repositories = []
        for repository in self.repository.feature_repositories(feature_id):
            observations = self.repository.list_observations(repository['id'])
            repositories.append(
                {
                    'id': repository['id'],
                    'root_path': repository['root_path'],
                    'status': repository['status'],
                    'latest_observation': observations[0] if observations else None,
                }
            )
        payload = {
            'schema_version': SCHEMA_VERSION,
            'project': {'id': project['id'], 'name': project['name'], 'status': project['status']},
            'feature': {
                'id': feature['id'],
                'title': feature['title'],
                'goal': feature['goal'],
                'status': feature['status'],
                'priority': feature['priority'],
            },
            'planning': {
                'tasks': self.repository.list_tasks(feature_id),
                'acceptance_criteria': self.repository.list_criteria(feature_id),
            },
            'repositories': repositories,
        }
        canonical = json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=True)
        return {
            'schema_version': SCHEMA_VERSION,
            'fingerprint': hashlib.sha256(canonical.encode()).hexdigest(),
            'payload': payload,
            'canonical_json': canonical,
            'markdown': f'# {feature["title"]}\n\nSchema: {SCHEMA_VERSION}\n\nProject: {project["name"]}\n\nThis package contains planning and metadata-only repository observations. It does not contain source content.',
        }

    def preview(self, workspace_id: str, project_id: str, feature_id: str) -> dict[str, Any]:
        built = self._build(workspace_id, project_id, feature_id)
        return {
            'schema_version': built['schema_version'],
            'fingerprint': built['fingerprint'],
            'payload': built['payload'],
            'markdown': built['markdown'],
        }

    def save(self, workspace_id: str, project_id: str, feature_id: str) -> dict[str, Any]:
        project, _feature = self._scope(workspace_id, project_id, feature_id)
        if project['status'] != 'active':
            raise ValueError('Archived projects are read-only')
        built = self._build(workspace_id, project_id, feature_id)
        return self.repository.save_context_package(
            {
                'project_id': project_id,
                'feature_id': feature_id,
                'schema_version': built['schema_version'],
                'fingerprint': built['fingerprint'],
                'payload_json': built['canonical_json'],
                'markdown': built['markdown'],
            }
        )

    def list(self, workspace_id: str, project_id: str, feature_id: str) -> list[dict[str, Any]]:
        self._scope(workspace_id, project_id, feature_id)
        return self.repository.list_context_packages(feature_id)

    def get(
        self, workspace_id: str, project_id: str, feature_id: str, package_id: str
    ) -> dict[str, Any]:
        self._scope(workspace_id, project_id, feature_id)
        package = self.repository.get_context_package(feature_id, package_id)
        if package is None:
            raise LookupError('Context package not found')
        return package
