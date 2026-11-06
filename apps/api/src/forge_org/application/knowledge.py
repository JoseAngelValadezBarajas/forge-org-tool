from typing import Any

from forge_org.application.ports import PlanningStore
from forge_org.domain.errors import NotFound
from forge_org.domain.planning import clean_description, ensure_project_writable


class KnowledgeService:
    def __init__(self, repository: PlanningStore) -> None:
        self.repository = repository

    def project(self, workspace_id: str, project_id: str) -> dict[str, Any]:
        project = self.repository.get_project(workspace_id, project_id)
        if project is None:
            raise NotFound('Project not found')
        return project

    def feature(self, workspace_id: str, project_id: str, feature_id: str) -> dict[str, Any]:
        self.project(workspace_id, project_id)
        feature = self.repository.feature(project_id, feature_id)
        if feature is None:
            raise NotFound('Feature not found')
        return feature

    def criteria(self, workspace_id: str, project_id: str, feature_id: str) -> list[dict[str, Any]]:
        self.feature(workspace_id, project_id, feature_id)
        return self.repository.list_criteria(feature_id)

    def create_criterion(
        self, workspace_id: str, project_id: str, feature_id: str, description: str
    ) -> dict[str, Any]:
        self.feature(workspace_id, project_id, feature_id)
        ensure_project_writable(self.project(workspace_id, project_id))
        clean_description(description)
        return self.repository.create_criterion(feature_id, description)
