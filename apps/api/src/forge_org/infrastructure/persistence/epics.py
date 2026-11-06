"""EpicPersistence: SQLite persistence for the epics aggregate."""

from typing import Any
from uuid import uuid4

from forge_org.domain.clock import utc_now

from .common import row_dict
from .tags import TagPersistence


class EpicPersistence(TagPersistence):
    def list_epics(self, project_id: str) -> list[dict[str, Any]]:
        rows = self.connection.execute(
            'SELECT id FROM epics WHERE project_id = ? ORDER BY created_at', (project_id,)
        ).fetchall()
        return [self.get_epic(project_id, row['id']) or {} for row in rows]

    def get_epic(self, project_id: str, epic_id: str) -> dict[str, Any] | None:
        item = row_dict(
            self.connection.execute(
                'SELECT * FROM epics WHERE project_id = ? AND id = ?', (project_id, epic_id)
            ).fetchone()
        )
        if item is None:
            return None
        item['tags'] = self._work_item_tags('epic', epic_id)
        totals = self.connection.execute(
            "SELECT count(*) AS total, sum(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS completed FROM features WHERE epic_id = ?",
            (epic_id,),
        ).fetchone()
        item['feature_count'] = totals['total']
        item['completed_feature_count'] = totals['completed'] or 0
        item['progress'] = (
            round(100 * item['completed_feature_count'] / item['feature_count'])
            if item['feature_count']
            else 0
        )
        return item

    def create_epic(
        self,
        workspace_id: str,
        project_id: str,
        title: str,
        description: str | None,
        priority: str,
        tags: list[str],
    ) -> dict[str, Any]:
        now, epic_id = utc_now(), str(uuid4())
        try:
            self.connection.execute(
                "INSERT INTO epics(id, project_id, title, description, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, 'backlog', ?, ?, ?)",
                (epic_id, project_id, title, description, priority, now, now),
            )
            self._set_work_item_tags(workspace_id, 'epic', epic_id, tags)
            self.connection.commit()
        except Exception:
            self.connection.rollback()
            raise
        return self.get_epic(project_id, epic_id) or {}

    def update_epic(
        self, workspace_id: str, project_id: str, epic_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        tags = values.pop('tags', None)
        if not values and tags is None:
            return self.get_epic(project_id, epic_id)
        try:
            if values:
                assignments = ', '.join(f'{key} = ?' for key in values)
                self.connection.execute(
                    f'UPDATE epics SET {assignments}, updated_at = ? WHERE project_id = ? AND id = ?',
                    [*values.values(), utc_now(), project_id, epic_id],
                )
            if tags is not None:
                self._set_work_item_tags(workspace_id, 'epic', epic_id, tags)
            self.connection.commit()
        except Exception:
            self.connection.rollback()
            raise
        return self.get_epic(project_id, epic_id)
