"""FeaturePersistence: SQLite persistence for the features aggregate."""

from typing import Any
from uuid import uuid4

from forge_org.domain.clock import utc_now

from .common import row_dict
from .tags import TagPersistence


class FeaturePersistence(TagPersistence):
    def list_features(
        self,
        project_id: str,
        search: str | None,
        status: str | None,
        priority: str | None,
        epic_id: str | None,
    ) -> list[dict[str, Any]]:
        clauses, params = ['project_id = ?'], [project_id]
        if search:
            clauses.append("(lower(title) LIKE ? OR lower(coalesce(description, '')) LIKE ?)")
            term = f'%{search.strip().lower()}%'
            params.extend([term, term])
        if status:
            clauses.append('status = ?')
            params.append(status)
        if priority:
            clauses.append('priority = ?')
            params.append(priority)
        if epic_id:
            clauses.append('epic_id = ?')
            params.append(epic_id)
        rows = self.connection.execute(
            f'SELECT id FROM features WHERE {" AND ".join(clauses)} ORDER BY created_at', params
        ).fetchall()
        return [self.feature(project_id, row['id']) or {} for row in rows]

    def create_feature(
        self, workspace_id: str, project_id: str, values: dict[str, Any]
    ) -> dict[str, Any]:
        now, feature_id = utc_now(), str(uuid4())
        tags = values.pop('tags', [])
        try:
            self.connection.execute(
                'INSERT INTO features(id, project_id, epic_id, title, description, goal, priority, status, kind, bug_severity, steps_to_reproduce, expected_result, actual_result, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                (
                    feature_id,
                    project_id,
                    values.get('epic_id'),
                    values['title'],
                    values.get('description'),
                    values.get('goal'),
                    values.get('priority', 'medium'),
                    values.get('status', 'backlog'),
                    values.get('kind', 'story'),
                    values.get('bug_severity'),
                    values.get('steps_to_reproduce'),
                    values.get('expected_result'),
                    values.get('actual_result'),
                    values.get('notes'),
                    now,
                    now,
                ),
            )
            self._set_work_item_tags(workspace_id, 'feature', feature_id, tags)
            self.connection.commit()
        except Exception:
            self.connection.rollback()
            raise
        return self.feature(project_id, feature_id) or {}

    def feature(self, project_id: str, feature_id: str) -> dict[str, Any] | None:
        item = row_dict(
            self.connection.execute(
                'SELECT * FROM features WHERE project_id = ? AND id = ?', (project_id, feature_id)
            ).fetchone()
        )
        if item is not None:
            item['tags'] = self._work_item_tags('feature', feature_id)
        return item

    def update_feature(
        self,
        workspace_id: str,
        project_id: str,
        feature_id: str,
        values: dict[str, Any],
    ) -> dict[str, Any] | None:
        tags = values.pop('tags', None)
        if not values and tags is None:
            return self.feature(project_id, feature_id)
        try:
            if values:
                assignments = ', '.join(f'{key} = ?' for key in values)
                self.connection.execute(
                    f'UPDATE features SET {assignments}, updated_at = ? WHERE project_id = ? AND id = ?',
                    [*values.values(), utc_now(), project_id, feature_id],
                )
            if tags is not None:
                self._set_work_item_tags(workspace_id, 'feature', feature_id, tags)
            self.connection.commit()
        except Exception:
            self.connection.rollback()
            raise
        return self.feature(project_id, feature_id)
