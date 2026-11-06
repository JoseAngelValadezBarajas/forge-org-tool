"""TaskPersistence: SQLite persistence for the tasks aggregate."""

from typing import Any
from uuid import uuid4

from forge_org.domain.clock import utc_now

from .base import PersistenceBase
from .common import row_dict


class TaskPersistence(PersistenceBase):
    def create_task(self, feature_id: str, values: dict[str, Any]) -> dict[str, Any]:
        now, task_id = utc_now(), str(uuid4())
        self.connection.execute(
            'INSERT INTO tasks(id, feature_id, title, description, status, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (
                task_id,
                feature_id,
                values['title'],
                values.get('description'),
                values.get('status', 'todo'),
                values.get('position', 0),
                now,
                now,
            ),
        )
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
            )
            or {}
        )

    def list_tasks(self, feature_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM tasks WHERE feature_id = ? ORDER BY position, created_at',
                (feature_id,),
            ).fetchall()
        ]

    def update_task(
        self, feature_id: str, task_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        item = row_dict(
            self.connection.execute(
                'SELECT * FROM tasks WHERE feature_id = ? AND id = ?', (feature_id, task_id)
            ).fetchone()
        )
        if item is None:
            return None
        if not values:
            return item
        assignments = ', '.join(f'{key} = ?' for key in values)
        self.connection.execute(
            f'UPDATE tasks SET {assignments}, updated_at = ? WHERE feature_id = ? AND id = ?',
            [*values.values(), utc_now(), feature_id, task_id],
        )
        self.connection.commit()
        return row_dict(
            self.connection.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()
        )

    def reorder_tasks(self, feature_id: str, ids: list[str]) -> list[dict[str, Any]]:
        now = utc_now()
        for position, task_id in enumerate(ids):
            self.connection.execute(
                'UPDATE tasks SET position = ?, updated_at = ? WHERE feature_id = ? AND id = ?',
                (position, now, feature_id, task_id),
            )
        self.connection.commit()
        return self.list_tasks(feature_id)
