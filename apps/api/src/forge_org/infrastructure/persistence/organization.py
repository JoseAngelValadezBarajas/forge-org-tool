"""Compatibility facade for the organization persistence contract."""

import sqlite3
from typing import Any

from .common import row_dict, unique_as_duplicate
from .criteria import CriteriaPersistence
from .dependencies import DependencyPersistence
from .epics import EpicPersistence
from .features import FeaturePersistence
from .projects import ProjectPersistence
from .tasks import TaskPersistence
from .workspaces import WorkspacePersistence

__all__ = ['OrganizationRepository', 'row_dict']


class OrganizationRepository(
    WorkspacePersistence,
    ProjectPersistence,
    EpicPersistence,
    FeaturePersistence,
    CriteriaPersistence,
    TaskPersistence,
    DependencyPersistence,
):
    """Stable repository facade composed from cohesive persistence groups."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    @unique_as_duplicate
    def create_workspace(self, name: str, description: str | None) -> dict[str, Any]:
        return super().create_workspace(name, description)

    @unique_as_duplicate
    def update_workspace(self, workspace_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
        return super().update_workspace(workspace_id, values)

    @unique_as_duplicate
    def create_project(
        self, workspace_id: str, name: str, description: str | None
    ) -> dict[str, Any]:
        return super().create_project(workspace_id, name, description)

    @unique_as_duplicate
    def update_project(
        self, workspace_id: str, project_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        return super().update_project(workspace_id, project_id, values)

    @unique_as_duplicate
    def create_workspace_tag(self, workspace_id: str, name: str, color: str) -> dict[str, Any]:
        return super().create_workspace_tag(workspace_id, name, color)

    @unique_as_duplicate
    def update_workspace_tag(
        self, workspace_id: str, tag_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        return super().update_workspace_tag(workspace_id, tag_id, values)

    @unique_as_duplicate
    def create_dependency(
        self, project_id: str, blocking_feature_id: str, blocked_feature_id: str
    ) -> dict[str, Any]:
        return super().create_dependency(project_id, blocking_feature_id, blocked_feature_id)
