import sqlite3
from typing import Any

from forge_org.infrastructure.persistence import OrganizationRepository


class KnowledgeService:
    def __init__(self, connection: sqlite3.Connection):
        self.repository = OrganizationRepository(connection)

    def project(self, workspace_id: str, project_id: str) -> dict[str, Any]:
        project = self.repository.get_project(workspace_id, project_id)
        if project is None:
            raise LookupError('Project not found')
        return project

    def feature(self, workspace_id: str, project_id: str, feature_id: str) -> dict[str, Any]:
        self.project(workspace_id, project_id)
        feature = self.repository.feature(project_id, feature_id)
        if feature is None:
            raise LookupError('Feature not found')
        return feature

    def criteria(self, workspace_id: str, project_id: str, feature_id: str) -> list[dict[str, Any]]:
        self.feature(workspace_id, project_id, feature_id)
        return self.repository.list_criteria(feature_id)

    def create_criterion(
        self, workspace_id: str, project_id: str, feature_id: str, description: str
    ) -> dict[str, Any]:
        self.feature(workspace_id, project_id, feature_id)
        if self.project(workspace_id, project_id)['status'] != 'active':
            raise ValueError('Archived projects are read-only')
        if not description.strip():
            raise ValueError('Description is required')
        return self.repository.create_criterion(feature_id, description)
