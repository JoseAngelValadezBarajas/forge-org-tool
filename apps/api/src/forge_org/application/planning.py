from typing import Any

from forge_org.application.ports import PlanningStore
from forge_org.domain.planning import (
    clean_description,
    clean_title,
    dependency_endpoints,
    ensure_project_writable,
)


class PlanningService:
    def __init__(self, repository: PlanningStore) -> None:
        self.repository = repository

    def _project(self, workspace_id: str, project_id: str) -> dict[str, Any]:
        project = self.repository.get_project(workspace_id, project_id)
        if project is None:
            raise LookupError('Project not found')
        return project

    def list_epics(self, workspace_id: str, project_id: str) -> list[dict[str, Any]]:
        self._project(workspace_id, project_id)
        return self.repository.list_epics(project_id)

    def create_epic(
        self,
        workspace_id: str,
        project_id: str,
        title: str,
        description: str | None,
        priority: str = 'medium',
        tags: list[str] | None = None,
    ) -> dict[str, Any]:
        self._project(workspace_id, project_id)
        return self.repository.create_epic(
            workspace_id, project_id, clean_title(title), description, priority, tags or []
        )

    def update_epic(
        self, workspace_id: str, project_id: str, epic_id: str, values: dict[str, Any]
    ) -> dict[str, Any]:
        self._project(workspace_id, project_id)
        if self.repository.get_epic(project_id, epic_id) is None:
            raise LookupError('Epic not found')
        if 'title' in values:
            values['title'] = clean_title(values['title'])
        return self.repository.update_epic(workspace_id, project_id, epic_id, values) or {}

    def list_features(
        self,
        workspace_id: str,
        project_id: str,
        search: str | None,
        status: str | None,
        priority: str | None,
        epic_id: str | None,
    ) -> list[dict[str, Any]]:
        self._project(workspace_id, project_id)
        if epic_id and self.repository.get_epic(project_id, epic_id) is None:
            raise LookupError('Epic not found')
        return self.repository.list_features(project_id, search, status, priority, epic_id)

    def create_feature(
        self, workspace_id: str, project_id: str, values: dict[str, Any]
    ) -> dict[str, Any]:
        self._project(workspace_id, project_id)
        title = clean_title(values.get('title'))
        if (
            values.get('epic_id')
            and self.repository.get_epic(project_id, values['epic_id']) is None
        ):
            raise LookupError('Epic not found')
        values['title'] = title
        return self.repository.create_feature(workspace_id, project_id, values)

    def update_feature(
        self, workspace_id: str, project_id: str, feature_id: str, values: dict[str, Any]
    ) -> dict[str, Any]:
        self._project(workspace_id, project_id)
        if self.repository.feature(project_id, feature_id) is None:
            raise LookupError('Feature not found')
        if values.pop('clear_epic', False):
            values['epic_id'] = None
        if (
            values.get('epic_id')
            and self.repository.get_epic(project_id, values['epic_id']) is None
        ):
            raise LookupError('Epic not found')
        if 'title' in values:
            values['title'] = clean_title(values['title'])
        return self.repository.update_feature(workspace_id, project_id, feature_id, values) or {}

    def workspace_tags(self, workspace_id: str) -> list[dict[str, Any]]:
        if self.repository.get_workspace(workspace_id) is None:
            raise LookupError('Workspace not found')
        return self.repository.list_workspace_tags(workspace_id)

    def create_workspace_tag(self, workspace_id: str, name: str, color: str) -> dict[str, Any]:
        if self.repository.get_workspace(workspace_id) is None:
            raise LookupError('Workspace not found')
        return self.repository.create_workspace_tag(workspace_id, name, color)

    def update_workspace_tag(
        self, workspace_id: str, tag_id: str, values: dict[str, Any]
    ) -> dict[str, Any]:
        if self.repository.get_workspace(workspace_id) is None:
            raise LookupError('Workspace not found')
        item = self.repository.update_workspace_tag(workspace_id, tag_id, values)
        if item is None:
            raise LookupError('Workspace tag not found')
        return item

    def delete_workspace_tag(self, workspace_id: str, tag_id: str) -> None:
        if self.repository.get_workspace(workspace_id) is None:
            raise LookupError('Workspace not found')
        if not self.repository.delete_workspace_tag(workspace_id, tag_id):
            raise LookupError('Workspace tag not found')

    def overview(self, workspace_id: str, project_id: str) -> dict[str, Any]:
        epics = self.list_epics(workspace_id, project_id)
        features = self.list_features(workspace_id, project_id, None, None, None, None)
        return {
            'epics': [
                {
                    **epic,
                    'features': [
                        feature for feature in features if feature['epic_id'] == epic['id']
                    ],
                }
                for epic in epics
            ],
            'unassigned_features': [feature for feature in features if feature['epic_id'] is None],
        }

    def feature(self, workspace_id: str, project_id: str, feature_id: str) -> dict[str, Any]:
        self._project(workspace_id, project_id)
        feature = self.repository.feature(project_id, feature_id)
        if feature is None:
            raise LookupError('Feature not found')
        return feature

    def update_criterion(
        self,
        workspace_id: str,
        project_id: str,
        feature_id: str,
        criterion_id: str,
        values: dict[str, Any],
    ) -> dict[str, Any]:
        self.feature(workspace_id, project_id, feature_id)
        ensure_project_writable(self._project(workspace_id, project_id))
        if 'description' in values:
            clean_description(values['description'])
        item = self.repository.update_criterion(feature_id, criterion_id, values)
        if item is None:
            raise LookupError('Acceptance criterion not found')
        return item

    def delete_criterion(
        self, workspace_id: str, project_id: str, feature_id: str, criterion_id: str
    ) -> None:
        self.feature(workspace_id, project_id, feature_id)
        ensure_project_writable(self._project(workspace_id, project_id))
        if not self.repository.delete_criterion(feature_id, criterion_id):
            raise LookupError('Acceptance criterion not found')

    def reorder_criteria(
        self, workspace_id: str, project_id: str, feature_id: str, ids: list[str]
    ) -> list[dict[str, Any]]:
        self.feature(workspace_id, project_id, feature_id)
        ensure_project_writable(self._project(workspace_id, project_id))
        return self.repository.reorder_criteria(feature_id, ids)

    def create_task(
        self, workspace_id: str, project_id: str, feature_id: str, values: dict[str, Any]
    ) -> dict[str, Any]:
        self.feature(workspace_id, project_id, feature_id)
        values['title'] = clean_title(values.get('title'))
        return self.repository.create_task(feature_id, values)

    def tasks(self, workspace_id: str, project_id: str, feature_id: str) -> list[dict[str, Any]]:
        self.feature(workspace_id, project_id, feature_id)
        return self.repository.list_tasks(feature_id)

    def update_task(
        self,
        workspace_id: str,
        project_id: str,
        feature_id: str,
        task_id: str,
        values: dict[str, Any],
    ) -> dict[str, Any]:
        self.feature(workspace_id, project_id, feature_id)
        if 'title' in values:
            values['title'] = clean_title(values['title'])
        updated = self.repository.update_task(feature_id, task_id, values)
        if updated is None:
            raise LookupError('Task not found')
        return updated

    def reorder_tasks(
        self, workspace_id: str, project_id: str, feature_id: str, ids: list[str]
    ) -> list[dict[str, Any]]:
        self.feature(workspace_id, project_id, feature_id)
        return self.repository.reorder_tasks(feature_id, ids)

    def create_dependency(
        self, workspace_id: str, project_id: str, values: dict[str, Any]
    ) -> dict[str, Any]:
        self._project(workspace_id, project_id)
        blocking, blocked = dependency_endpoints(values)
        self.feature(workspace_id, project_id, blocking)
        self.feature(workspace_id, project_id, blocked)
        return self.repository.create_dependency(project_id, blocking, blocked)

    def dependencies(self, workspace_id: str, project_id: str) -> list[dict[str, Any]]:
        self._project(workspace_id, project_id)
        return self.repository.list_dependencies(project_id)

    def delete_dependency(self, workspace_id: str, project_id: str, dependency_id: str) -> None:
        self._project(workspace_id, project_id)
        if not self.repository.delete_dependency(project_id, dependency_id):
            raise LookupError('Dependency not found')
