import sqlite3
from typing import Any

from forge_org.infrastructure.sqlite import OrganizationRepository


class PlanningService:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.repository = OrganizationRepository(connection)

    def _project(self, workspace_id: str, project_id: str) -> dict[str, Any]:
        project = self.repository.get_project(workspace_id, project_id)
        if project is None:
            raise LookupError('Project not found')
        return project

    def list_epics(self, workspace_id: str, project_id: str) -> list[dict[str, Any]]:
        self._project(workspace_id, project_id)
        return self.repository.list_epics(project_id)

    def create_epic(self, workspace_id: str, project_id: str, title: str, description: str | None) -> dict[str, Any]:
        self._project(workspace_id, project_id)
        if not title.strip(): raise ValueError('Title is required')
        return self.repository.create_epic(project_id, title.strip(), description)

    def list_features(self, workspace_id: str, project_id: str, search: str | None, status: str | None, priority: str | None, epic_id: str | None) -> list[dict[str, Any]]:
        self._project(workspace_id, project_id)
        if epic_id and self.repository.get_epic(project_id, epic_id) is None: raise LookupError('Epic not found')
        return self.repository.list_features(project_id, search, status, priority, epic_id)

    def create_feature(self, workspace_id: str, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        self._project(workspace_id, project_id)
        if not values.get('title', '').strip(): raise ValueError('Title is required')
        if values.get('epic_id') and self.repository.get_epic(project_id, values['epic_id']) is None: raise LookupError('Epic not found')
        values['title'] = values['title'].strip()
        return self.repository.create_feature(project_id, values)

    def overview(self, workspace_id: str, project_id: str) -> dict[str, Any]:
        epics = self.list_epics(workspace_id, project_id)
        features = self.list_features(workspace_id, project_id, None, None, None, None)
        return {'epics': [{**epic, 'features': [feature for feature in features if feature['epic_id'] == epic['id']]} for epic in epics], 'unassigned_features': [feature for feature in features if feature['epic_id'] is None]}
