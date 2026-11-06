"""TagPersistence: SQLite persistence for the tags aggregate."""

from typing import Any
from uuid import uuid4

from forge_org.domain.clock import utc_now
from forge_org.domain.errors import InvalidInput
from forge_org.domain.tags import normalize_tag_name

from .base import PersistenceBase


class TagPersistence(PersistenceBase):
    def list_workspace_tags(self, workspace_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM tags WHERE workspace_id = ? ORDER BY normalized_name, id',
                (workspace_id,),
            ).fetchall()
        ]

    def create_workspace_tag(self, workspace_id: str, name: str, color: str) -> dict[str, Any]:
        safe_name, normalized = normalize_tag_name(name)
        tag_id = str(uuid4())
        self.connection.execute(
            'INSERT INTO tags(id, workspace_id, name, normalized_name, color, created_at) '
            'VALUES (?, ?, ?, ?, ?, ?)',
            (tag_id, workspace_id, safe_name, normalized, color, utc_now()),
        )
        self.connection.commit()
        return dict(
            self.connection.execute('SELECT * FROM tags WHERE id = ?', (tag_id,)).fetchone()
        )

    def update_workspace_tag(
        self, workspace_id: str, tag_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        tag = self.connection.execute(
            'SELECT * FROM tags WHERE workspace_id = ? AND id = ?', (workspace_id, tag_id)
        ).fetchone()
        if tag is None:
            return None
        assignments: dict[str, Any] = {}
        if 'name' in values:
            name, normalized = normalize_tag_name(values['name'])
            assignments.update(name=name, normalized_name=normalized)
        if 'color' in values:
            assignments['color'] = values['color']
        if assignments:
            columns = ', '.join(f'{key} = ?' for key in assignments)
            self.connection.execute(
                f'UPDATE tags SET {columns} WHERE workspace_id = ? AND id = ?',
                [*assignments.values(), workspace_id, tag_id],
            )
            self.connection.commit()
        return dict(
            self.connection.execute('SELECT * FROM tags WHERE id = ?', (tag_id,)).fetchone()
        )

    def delete_workspace_tag(self, workspace_id: str, tag_id: str) -> bool:
        cursor = self.connection.execute(
            'DELETE FROM tags WHERE workspace_id = ? AND id = ?', (workspace_id, tag_id)
        )
        if cursor.rowcount:
            self.connection.commit()
            return True
        return False

    def _set_work_item_tags(
        self, workspace_id: str, item_type: str, item_id: str, names: list[str]
    ) -> list[str]:
        relations = {
            'epic': ('epic_tags', 'epic_id'),
            'feature': ('feature_tags', 'feature_id'),
        }
        if item_type not in relations:
            raise InvalidInput('Unsupported tagged item type')
        relation_table, item_column = relations[item_type]
        self.connection.execute(f'DELETE FROM {relation_table} WHERE {item_column} = ?', (item_id,))
        normalized_names: dict[str, str] = {}
        for raw_name in names:
            if not isinstance(raw_name, str):
                raise InvalidInput('Tags must be text')
            name, normalized = normalize_tag_name(raw_name)
            normalized_names.setdefault(normalized, name)

        assigned: list[str] = []
        for normalized, name in normalized_names.items():
            self.connection.execute(
                'INSERT OR IGNORE INTO tags(id, workspace_id, name, normalized_name, created_at) VALUES (?, ?, ?, ?, ?)',
                (str(uuid4()), workspace_id, name, normalized, utc_now()),
            )
            tag = self.connection.execute(
                'SELECT id, name FROM tags WHERE workspace_id = ? AND normalized_name = ?',
                (workspace_id, normalized),
            ).fetchone()
            self.connection.execute(
                f'INSERT INTO {relation_table}({item_column}, tag_id) VALUES (?, ?)',
                (item_id, tag['id']),
            )
            assigned.append(tag['name'])
        return assigned

    def _work_item_tags(self, item_type: str, item_id: str) -> list[str]:
        relations = {
            'epic': ('epic_tags', 'epic_id'),
            'feature': ('feature_tags', 'feature_id'),
        }
        relation_table, item_column = relations[item_type]
        return [
            row[0]
            for row in self.connection.execute(
                f'SELECT tags.name FROM {relation_table} JOIN tags ON tags.id = {relation_table}.tag_id WHERE {item_column} = ? ORDER BY tags.normalized_name',
                (item_id,),
            ).fetchall()
        ]
