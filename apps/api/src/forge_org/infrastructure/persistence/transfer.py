"""SQLite adapter for project transfer (import/export) persistence."""

import sqlite3
from typing import Any

from .common import unique_as_duplicate
from .organization import OrganizationRepository


class SqliteTransferStore:
    """All SQL used by project import/export. Transactions are controlled by the caller."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    # -- transaction control -------------------------------------------------
    def begin_immediate(self) -> None:
        self.connection.execute('BEGIN IMMEDIATE')

    @unique_as_duplicate
    def commit(self) -> None:
        self.connection.commit()

    def rollback(self) -> None:
        self.connection.rollback()

    # -- lookups ---------------------------------------------------------------
    def workspace_exists(self, workspace_id: str) -> bool:
        return (
            self.connection.execute(
                'SELECT 1 FROM workspaces WHERE id = ?', (workspace_id,)
            ).fetchone()
            is not None
        )

    def project_status(self, workspace_id: str, project_id: str) -> str | None:
        row = self.connection.execute(
            'SELECT status FROM projects WHERE workspace_id = ? AND id = ?',
            (workspace_id, project_id),
        ).fetchone()
        return None if row is None else str(row['status'])

    def epic_exists(self, project_id: str, epic_id: str) -> bool:
        return (
            self.connection.execute(
                'SELECT 1 FROM epics WHERE project_id = ? AND id = ?', (project_id, epic_id)
            ).fetchone()
            is not None
        )

    def feature_exists(self, project_id: str, feature_id: str) -> bool:
        return (
            self.connection.execute(
                'SELECT 1 FROM features WHERE project_id = ? AND id = ?', (project_id, feature_id)
            ).fetchone()
            is not None
        )

    def feature_kind(self, project_id: str, feature_id: str) -> str | None:
        row = self.connection.execute(
            'SELECT kind FROM features WHERE id = ? AND project_id = ?', (feature_id, project_id)
        ).fetchone()
        return None if row is None else str(row['kind'])

    # -- export reads ------------------------------------------------------------
    def export_project_row(self, workspace_id: str, project_id: str) -> dict[str, Any] | None:
        row = self.connection.execute(
            'SELECT * FROM projects WHERE workspace_id = ? AND id = ?', (workspace_id, project_id)
        ).fetchone()
        return None if row is None else dict(row)

    def export_epics(self, project_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM epics WHERE project_id = ? ORDER BY created_at', (project_id,)
            ).fetchall()
        ]

    def export_features(self, project_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM features WHERE project_id = ? ORDER BY created_at', (project_id,)
            ).fetchall()
        ]

    def feature_kinds_in_export_order(self, project_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT id, kind FROM features WHERE project_id = ? ORDER BY created_at',
                (project_id,),
            ).fetchall()
        ]

    def export_tasks(self, feature_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM tasks WHERE feature_id = ? ORDER BY position, id', (feature_id,)
            ).fetchall()
        ]

    def export_criteria(self, feature_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM acceptance_criteria WHERE feature_id = ? ORDER BY position, id',
                (feature_id,),
            ).fetchall()
        ]

    def export_dependencies(self, project_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT blocking_feature_id, blocked_feature_id FROM feature_dependencies '
                'WHERE project_id = ? ORDER BY created_at, id',
                (project_id,),
            ).fetchall()
        ]

    def tag_names(self, item_type: str, item_id: str) -> list[str]:
        table, column = {
            'epic': ('epic_tags', 'epic_id'),
            'feature': ('feature_tags', 'feature_id'),
        }[item_type]
        return [
            row[0]
            for row in self.connection.execute(
                f'SELECT tags.name FROM {table} JOIN tags ON tags.id = {table}.tag_id '
                f'WHERE {column} = ? ORDER BY tags.normalized_name',
                (item_id,),
            ).fetchall()
        ]

    def epic_ids_in_export_order(self, project_id: str) -> list[str]:
        return [row['id'] for row in self._ordered_ids('epics', project_id)]

    def feature_ids_in_export_order(self, project_id: str) -> list[str]:
        return [row['id'] for row in self._ordered_ids('features', project_id)]

    def _ordered_ids(self, table: str, project_id: str) -> list[sqlite3.Row]:
        assert table in {'epics', 'features'}
        return self.connection.execute(
            f'SELECT id FROM {table} WHERE project_id = ? ORDER BY created_at', (project_id,)
        ).fetchall()

    # -- import writes (no commit) ---------------------------------------------
    @unique_as_duplicate
    def insert_project(
        self,
        project_id: str,
        workspace_id: str,
        name: str,
        description: str | None,
        now: str,
    ) -> None:
        self.connection.execute(
            'INSERT INTO projects(id, workspace_id, name, description, status, created_at, '
            "updated_at, archived_at) VALUES (?, ?, ?, ?, 'active', ?, ?, NULL)",
            (project_id, workspace_id, name, description, now, now),
        )

    @unique_as_duplicate
    def insert_epic(
        self,
        epic_id: str,
        project_id: str,
        title: str,
        description: str | None,
        priority: str,
        now: str,
    ) -> None:
        self.connection.execute(
            'INSERT INTO epics(id, project_id, title, description, priority, created_at, '
            'updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (epic_id, project_id, title, description, priority, now, now),
        )

    @unique_as_duplicate
    def insert_feature(
        self, feature_id: str, project_id: str, values: dict[str, Any], now: str
    ) -> None:
        self.connection.execute(
            'INSERT INTO features(id, project_id, epic_id, title, description, goal, priority, '
            'status, kind, bug_severity, steps_to_reproduce, expected_result, actual_result, '
            'notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                feature_id,
                project_id,
                values['epic_id'],
                values['title'],
                values['description'],
                values['goal'],
                values['priority'],
                values['status'],
                values['kind'],
                values['bug_severity'],
                values['steps_to_reproduce'],
                values['expected_result'],
                values['actual_result'],
                values['notes'],
                now,
                now,
            ),
        )

    @unique_as_duplicate
    def set_work_item_tags(
        self, workspace_id: str, item_type: str, item_id: str, tags: list[Any]
    ) -> None:
        OrganizationRepository(self.connection)._set_work_item_tags(
            workspace_id, item_type, item_id, tags
        )

    @unique_as_duplicate
    def insert_task(
        self,
        task_id: str,
        feature_id: str,
        title: str,
        description: str | None,
        status: str,
        position: int,
        now: str,
    ) -> None:
        self.connection.execute(
            'INSERT INTO tasks(id, feature_id, title, description, status, position, created_at, '
            'updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (task_id, feature_id, title, description, status, position, now, now),
        )

    @unique_as_duplicate
    def insert_criterion(
        self,
        criterion_id: str,
        feature_id: str,
        description: str,
        satisfied: bool,
        position: int,
        now: str,
    ) -> None:
        self.connection.execute(
            'INSERT INTO acceptance_criteria(id, feature_id, description, satisfied, position, '
            'created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (criterion_id, feature_id, description, satisfied, position, now, now),
        )

    @unique_as_duplicate
    def insert_dependency(
        self, dependency_id: str, project_id: str, blocking_id: str, blocked_id: str, now: str
    ) -> None:
        self.connection.execute(
            'INSERT INTO feature_dependencies(id, project_id, blocking_feature_id, '
            'blocked_feature_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            (dependency_id, project_id, blocking_id, blocked_id, now, now),
        )

    @unique_as_duplicate
    def insert_attachment(self, feature_id: str, attachment: dict[str, Any]) -> None:
        self.connection.execute(
            'INSERT INTO bug_attachments(id, feature_id, relative_path, file_name, '
            'content_type, byte_size, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (
                attachment['id'],
                feature_id,
                attachment['relative_path'],
                attachment['file_name'],
                attachment['content_type'],
                attachment['byte_size'],
                attachment['sha256'],
                attachment['created_at'],
            ),
        )

    def next_task_position(self, feature_id: str) -> int:
        return int(
            self.connection.execute(
                'SELECT COALESCE(MAX(position) + 1, 0) FROM tasks WHERE feature_id = ?',
                (feature_id,),
            ).fetchone()[0]
        )

    # -- contextual import: move a staged project's content into the destination ----
    @unique_as_duplicate
    def adopt_staged_project(
        self, scope: str, staged_project_id: str, project_id: str, destination_id: str
    ) -> None:
        if scope == 'epics':
            self.connection.execute(
                'UPDATE epics SET project_id = ? WHERE project_id = ?',
                (project_id, staged_project_id),
            )
            self.connection.execute(
                'UPDATE features SET project_id = ? WHERE project_id = ?',
                (project_id, staged_project_id),
            )
        else:
            self.connection.execute(
                'UPDATE features SET project_id = ?, epic_id = ? WHERE project_id = ?',
                (project_id, destination_id, staged_project_id),
            )
        self.connection.execute(
            'UPDATE feature_dependencies SET project_id = ? WHERE project_id = ?',
            (project_id, staged_project_id),
        )
        self.connection.execute('DELETE FROM projects WHERE id = ?', (staged_project_id,))
