"""CriteriaPersistence: SQLite persistence for the criteria aggregate."""

from typing import Any
from uuid import uuid4

from forge_org.domain.clock import utc_now

from .base import PersistenceBase
from .common import row_dict


class CriteriaPersistence(PersistenceBase):
    def create_criterion(
        self, feature_id: str, description: str, position: int | None = None
    ) -> dict[str, Any]:
        now, criterion_id = utc_now(), str(uuid4())
        if position is None:
            position = self.connection.execute(
                'SELECT COALESCE(MAX(position) + 1, 0) FROM acceptance_criteria WHERE feature_id = ?',
                (feature_id,),
            ).fetchone()[0]
        self.connection.execute(
            'INSERT INTO acceptance_criteria(id, feature_id, description, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            (criterion_id, feature_id, description.strip(), position, now, now),
        )
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute(
                    'SELECT * FROM acceptance_criteria WHERE id = ?', (criterion_id,)
                ).fetchone()
            )
            or {}
        )

    def list_criteria(self, feature_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM acceptance_criteria WHERE feature_id = ? ORDER BY position, id',
                (feature_id,),
            ).fetchall()
        ]

    def update_criterion(
        self, feature_id: str, criterion_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        item = row_dict(
            self.connection.execute(
                'SELECT * FROM acceptance_criteria WHERE feature_id = ? AND id = ?',
                (feature_id, criterion_id),
            ).fetchone()
        )
        if item is None:
            return None
        assignments = ', '.join(f'{key} = ?' for key in values)
        self.connection.execute(
            f'UPDATE acceptance_criteria SET {assignments}, updated_at = ? WHERE feature_id = ? AND id = ?',
            [*values.values(), utc_now(), feature_id, criterion_id],
        )
        self.connection.commit()
        return row_dict(
            self.connection.execute(
                'SELECT * FROM acceptance_criteria WHERE id = ?', (criterion_id,)
            ).fetchone()
        )

    def delete_criterion(self, feature_id: str, criterion_id: str) -> bool:
        cursor = self.connection.execute(
            'DELETE FROM acceptance_criteria WHERE feature_id = ? AND id = ?',
            (feature_id, criterion_id),
        )
        if cursor.rowcount:
            self.connection.commit()
            return True
        return False

    def reorder_criteria(self, feature_id: str, ids: list[str]) -> list[dict[str, Any]]:
        try:
            for position, criterion_id in enumerate(ids):
                self.connection.execute(
                    'UPDATE acceptance_criteria SET position = ?, updated_at = ? '
                    'WHERE feature_id = ? AND id = ?',
                    (position, utc_now(), feature_id, criterion_id),
                )
            self.connection.commit()
        except Exception:
            self.connection.rollback()
            raise
        return self.list_criteria(feature_id)
