"""DependencyPersistence: SQLite persistence for the dependencies aggregate."""

from typing import Any
from uuid import uuid4

from forge_org.domain.clock import utc_now

from .base import PersistenceBase
from .common import row_dict


class DependencyPersistence(PersistenceBase):
    def create_dependency(
        self, project_id: str, blocking_feature_id: str, blocked_feature_id: str
    ) -> dict[str, Any]:
        now, dependency_id = utc_now(), str(uuid4())
        self.connection.execute(
            'INSERT INTO feature_dependencies(id, project_id, blocking_feature_id, blocked_feature_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            (dependency_id, project_id, blocking_feature_id, blocked_feature_id, now, now),
        )
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute(
                    'SELECT * FROM feature_dependencies WHERE id = ?', (dependency_id,)
                ).fetchone()
            )
            or {}
        )

    def list_dependencies(self, project_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM feature_dependencies WHERE project_id = ? ORDER BY created_at',
                (project_id,),
            ).fetchall()
        ]

    def delete_dependency(self, project_id: str, dependency_id: str) -> bool:
        cursor = self.connection.execute(
            'DELETE FROM feature_dependencies WHERE project_id = ? AND id = ?',
            (project_id, dependency_id),
        )
        self.connection.commit()
        return cursor.rowcount == 1
