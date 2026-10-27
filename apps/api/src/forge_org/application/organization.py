import sqlite3
from typing import Any

from forge_org.domain.organization import ACTIVE, ARCHIVED, normalized_name, validate_project_status
from forge_org.infrastructure.connection import utc_now
from forge_org.infrastructure.persistence import OrganizationRepository


class NotFound(Exception):
    pass


class DuplicateName(Exception):
    pass


class InvalidInput(Exception):
    pass


class OrganizationService:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.repository = OrganizationRepository(connection)

    def list_workspaces(self) -> list[dict[str, Any]]:
        return self.repository.list_workspaces()

    def workspace(self, workspace_id: str) -> dict[str, Any]:
        workspace = self.repository.get_workspace(workspace_id)
        if workspace is None:
            raise NotFound('Workspace not found')
        return workspace

    def create_workspace(self, name: str, description: str | None) -> dict[str, Any]:
        try:
            return self.repository.create_workspace(normalized_name(name), description)
        except ValueError as exc:
            raise InvalidInput(str(exc)) from exc
        except sqlite3.IntegrityError as exc:
            raise DuplicateName('Workspace name already exists') from exc

    def update_workspace(self, workspace_id: str, values: dict[str, Any]) -> dict[str, Any]:
        self.workspace(workspace_id)
        if 'name' in values:
            try:
                values['name'] = normalized_name(values['name'])
            except ValueError as exc:
                raise InvalidInput(str(exc)) from exc
        try:
            return self.repository.update_workspace(workspace_id, values) or self.workspace(
                workspace_id
            )
        except sqlite3.IntegrityError as exc:
            raise DuplicateName('Workspace name already exists') from exc

    def set_workspace_status(self, workspace_id: str, archived: bool) -> dict[str, Any]:
        self.workspace(workspace_id)
        return self.repository.set_workspace_archive(
            workspace_id, utc_now() if archived else None
        ) or self.workspace(workspace_id)

    def delete_workspace(self, workspace_id: str) -> None:
        self.workspace(workspace_id)
        if not self.repository.delete_workspace(workspace_id):
            raise NotFound('Workspace not found')

    def projects(self, workspace_id: str, search: str | None, status: str) -> list[dict[str, Any]]:
        self.workspace(workspace_id)
        try:
            return self.repository.workspace_projects(
                workspace_id, search, validate_project_status(status)
            )
        except ValueError as exc:
            raise InvalidInput(str(exc)) from exc

    def project(self, workspace_id: str, project_id: str) -> dict[str, Any]:
        self.workspace(workspace_id)
        project = self.repository.get_project(workspace_id, project_id)
        if project is None:
            raise NotFound('Project not found')
        return project

    def create_project(
        self, workspace_id: str, name: str, description: str | None
    ) -> dict[str, Any]:
        self._writable_workspace(workspace_id)
        try:
            return self.repository.create_project(workspace_id, normalized_name(name), description)
        except ValueError as exc:
            raise InvalidInput(str(exc)) from exc
        except sqlite3.IntegrityError as exc:
            raise DuplicateName('Project name already exists in this workspace') from exc

    def update_project(
        self, workspace_id: str, project_id: str, values: dict[str, Any]
    ) -> dict[str, Any]:
        self._writable_workspace(workspace_id)
        self.project(workspace_id, project_id)
        if 'name' in values:
            try:
                values['name'] = normalized_name(values['name'])
            except ValueError as exc:
                raise InvalidInput(str(exc)) from exc
        if 'status' in values and values['status'] not in {ACTIVE, ARCHIVED}:
            raise InvalidInput('Unknown project status')
        try:
            return self.repository.update_project(workspace_id, project_id, values) or self.project(
                workspace_id, project_id
            )
        except sqlite3.IntegrityError as exc:
            raise DuplicateName('Project name already exists in this workspace') from exc

    def set_project_status(self, workspace_id: str, project_id: str, status: str) -> dict[str, Any]:
        if status not in {ACTIVE, ARCHIVED}:
            raise InvalidInput('Unknown project status')
        return self.update_project(
            workspace_id,
            project_id,
            {'status': status, 'archived_at': None if status == ACTIVE else utc_now()},
        )

    def _writable_workspace(self, workspace_id: str) -> dict[str, Any]:
        workspace = self.workspace(workspace_id)
        if workspace.get('archived_at'):
            raise InvalidInput('Workspace is archived and read-only')
        return workspace
