"""Ports the application layer depends on. Infrastructure implements them."""

from collections.abc import Callable
from pathlib import Path
from typing import Any, Protocol

Record = dict[str, Any]


class PlanningStore(Protocol):
    """Persistence operations for workspaces, projects and planning work items."""

    def create_criterion(
        self, feature_id: str, description: str, position: int | None = None
    ) -> Record: ...

    def create_dependency(
        self, project_id: str, blocking_feature_id: str, blocked_feature_id: str
    ) -> Record: ...

    def create_epic(
        self,
        workspace_id: str,
        project_id: str,
        title: str,
        description: str | None,
        priority: str,
        tags: list[str],
    ) -> Record: ...

    def create_feature(self, workspace_id: str, project_id: str, values: Record) -> Record: ...

    def create_project(self, workspace_id: str, name: str, description: str | None) -> Record: ...

    def create_task(self, feature_id: str, values: Record) -> Record: ...

    def create_workspace(self, name: str, description: str | None) -> Record: ...

    def create_workspace_tag(self, workspace_id: str, name: str, color: str) -> Record: ...

    def delete_criterion(self, feature_id: str, criterion_id: str) -> bool: ...

    def delete_dependency(self, project_id: str, dependency_id: str) -> bool: ...

    def delete_workspace(self, workspace_id: str, attachment_root: Path | None = None) -> bool: ...

    def delete_workspace_tag(self, workspace_id: str, tag_id: str) -> bool: ...

    def feature(self, project_id: str, feature_id: str) -> Record | None: ...

    def get_epic(self, project_id: str, epic_id: str) -> Record | None: ...

    def get_project(self, workspace_id: str, project_id: str) -> Record | None: ...

    def get_workspace(self, workspace_id: str) -> Record | None: ...

    def list_criteria(self, feature_id: str) -> list[Record]: ...

    def list_dependencies(self, project_id: str) -> list[Record]: ...

    def list_epics(self, project_id: str) -> list[Record]: ...

    def list_features(
        self,
        project_id: str,
        search: str | None,
        status: str | None,
        priority: str | None,
        epic_id: str | None,
    ) -> list[Record]: ...

    def list_tasks(self, feature_id: str) -> list[Record]: ...

    def list_workspace_tags(self, workspace_id: str) -> list[Record]: ...

    def list_workspaces(self) -> list[Record]: ...

    def reorder_criteria(self, feature_id: str, ids: list[str]) -> list[Record]: ...

    def reorder_tasks(self, feature_id: str, ids: list[str]) -> list[Record]: ...

    def set_workspace_archive(
        self, workspace_id: str, archived_at: str | None
    ) -> Record | None: ...

    def update_criterion(
        self, feature_id: str, criterion_id: str, values: Record
    ) -> Record | None: ...

    def update_epic(
        self, workspace_id: str, project_id: str, epic_id: str, values: Record
    ) -> Record | None: ...

    def update_feature(
        self, workspace_id: str, project_id: str, feature_id: str, values: Record
    ) -> Record | None: ...

    def update_project(
        self, workspace_id: str, project_id: str, values: Record
    ) -> Record | None: ...

    def update_task(self, feature_id: str, task_id: str, values: Record) -> Record | None: ...

    def update_workspace(self, workspace_id: str, values: Record) -> Record | None: ...

    def update_workspace_tag(
        self, workspace_id: str, tag_id: str, values: Record
    ) -> Record | None: ...

    def workspace_projects(
        self, workspace_id: str, search: str | None, status: str
    ) -> list[Record]: ...


class AttachmentStore(Protocol):
    """Bug attachment metadata persistence. File bytes stay with the application service."""

    def find_bug(self, workspace_id: str, project_id: str, feature_id: str) -> Record | None: ...

    def list_attachments(self, feature_id: str) -> list[Record]: ...

    def get_attachment(self, feature_id: str, attachment_id: str) -> Record | None: ...

    def add_attachment(
        self,
        feature_id: str,
        attachment: Record,
        *,
        limit: int,
        before_commit: Callable[[], None],
    ) -> bool: ...

    def delete_attachment(self, feature_id: str, attachment_id: str) -> None: ...


class TransferStore(Protocol):
    """Everything project import/export needs from persistence.

    Writes do not commit; the service controls the transaction so that a package
    import can include attachment metadata atomically.
    """

    def begin_immediate(self) -> None: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...

    def workspace_exists(self, workspace_id: str) -> bool: ...

    def project_status(self, workspace_id: str, project_id: str) -> str | None: ...

    def epic_exists(self, project_id: str, epic_id: str) -> bool: ...

    def feature_exists(self, project_id: str, feature_id: str) -> bool: ...

    def feature_kind(self, project_id: str, feature_id: str) -> str | None: ...

    def export_project_row(self, workspace_id: str, project_id: str) -> Record | None: ...

    def export_epics(self, project_id: str) -> list[Record]: ...

    def export_features(self, project_id: str) -> list[Record]: ...

    def feature_kinds_in_export_order(self, project_id: str) -> list[Record]: ...

    def export_tasks(self, feature_id: str) -> list[Record]: ...

    def export_criteria(self, feature_id: str) -> list[Record]: ...

    def export_dependencies(self, project_id: str) -> list[Record]: ...

    def tag_names(self, item_type: str, item_id: str) -> list[str]: ...

    def epic_ids_in_export_order(self, project_id: str) -> list[str]: ...

    def feature_ids_in_export_order(self, project_id: str) -> list[str]: ...

    def insert_project(
        self, project_id: str, workspace_id: str, name: str, description: str | None, now: str
    ) -> None: ...

    def insert_epic(
        self,
        epic_id: str,
        project_id: str,
        title: str,
        description: str | None,
        priority: str,
        now: str,
    ) -> None: ...

    def insert_feature(
        self, feature_id: str, project_id: str, values: Record, now: str
    ) -> None: ...

    def set_work_item_tags(
        self, workspace_id: str, item_type: str, item_id: str, tags: list[Any]
    ) -> None: ...

    def insert_task(
        self,
        task_id: str,
        feature_id: str,
        title: str,
        description: str | None,
        status: str,
        position: int,
        now: str,
    ) -> None: ...

    def insert_criterion(
        self,
        criterion_id: str,
        feature_id: str,
        description: str,
        satisfied: bool,
        position: int,
        now: str,
    ) -> None: ...

    def insert_dependency(
        self, dependency_id: str, project_id: str, blocking_id: str, blocked_id: str, now: str
    ) -> None: ...

    def insert_attachment(self, feature_id: str, attachment: Record) -> None: ...

    def next_task_position(self, feature_id: str) -> int: ...

    def adopt_staged_project(
        self, scope: str, staged_project_id: str, project_id: str, destination_id: str
    ) -> None: ...
