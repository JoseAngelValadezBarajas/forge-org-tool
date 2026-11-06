"""OrganizationPlanningPersistence persistence methods."""

import sqlite3
from pathlib import Path
from typing import Any
from uuid import uuid4

from forge_org.domain.clock import utc_now
from forge_org.domain.errors import InvalidInput
from forge_org.domain.tags import normalize_tag_name

from .common import row_dict


class OrganizationPlanningPersistence:
    connection: sqlite3.Connection

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

    def list_workspaces(self) -> list[dict[str, Any]]:
        rows = self.connection.execute(
            'SELECT * FROM workspaces ORDER BY lower(name), created_at'
        ).fetchall()
        return [dict(row) for row in rows]

    def get_workspace(self, workspace_id: str) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM workspaces WHERE id = ?', (workspace_id,)
            ).fetchone()
        )

    def create_workspace(self, name: str, description: str | None) -> dict[str, Any]:
        now = utc_now()
        workspace_id = str(uuid4())
        self.connection.execute(
            'INSERT INTO workspaces(id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            (workspace_id, name, description, now, now),
        )
        self.connection.commit()
        return self.get_workspace(workspace_id) or {}

    def delete_workspace(self, workspace_id: str, attachment_root: Path | None = None) -> bool:
        attachment_paths: list[Path] = []
        if attachment_root is not None:
            attachment_root = attachment_root.resolve()
            rows = self.connection.execute(
                'SELECT ba.relative_path '
                'FROM bug_attachments ba '
                'JOIN features f ON f.id = ba.feature_id '
                'JOIN projects p ON p.id = f.project_id '
                'WHERE p.workspace_id = ?',
                (workspace_id,),
            ).fetchall()
            for row in rows:
                relative_path = row['relative_path']
                candidate = (attachment_root / relative_path).resolve()
                if (
                    Path(relative_path).name == relative_path
                    and candidate.parent == attachment_root
                ):
                    attachment_paths.append(candidate)
        cursor = self.connection.execute('DELETE FROM workspaces WHERE id = ?', (workspace_id,))
        if cursor.rowcount:
            self.connection.commit()
            for path in attachment_paths:
                path.unlink(missing_ok=True)
            return True
        return False

    def update_workspace(self, workspace_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
        if not values:
            return self.get_workspace(workspace_id)
        assignments = ', '.join(f'{key} = ?' for key in values)
        params = [*values.values(), utc_now(), workspace_id]
        self.connection.execute(
            f'UPDATE workspaces SET {assignments}, updated_at = ? WHERE id = ?', params
        )
        self.connection.commit()
        return self.get_workspace(workspace_id)

    def set_workspace_archive(
        self, workspace_id: str, archived_at: str | None
    ) -> dict[str, Any] | None:
        self.connection.execute(
            'UPDATE workspaces SET archived_at = ?, updated_at = ? WHERE id = ?',
            (archived_at, utc_now(), workspace_id),
        )
        self.connection.commit()
        return self.get_workspace(workspace_id)

    def workspace_projects(
        self, workspace_id: str, search: str | None, status: str
    ) -> list[dict[str, Any]]:
        clauses = ['workspace_id = ?']
        params: list[Any] = [workspace_id]
        if search:
            clauses.append("(lower(name) LIKE ? OR lower(coalesce(description, '')) LIKE ?)")
            term = f'%{search.strip().lower()}%'
            params.extend([term, term])
        if status != 'all':
            clauses.append('status = ?')
            params.append(status)
        rows = self.connection.execute(
            f'SELECT * FROM projects WHERE {" AND ".join(clauses)} ORDER BY lower(name), created_at',
            params,
        ).fetchall()
        return [dict(row) for row in rows]

    def get_project(self, workspace_id: str, project_id: str) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM projects WHERE workspace_id = ? AND id = ?',
                (workspace_id, project_id),
            ).fetchone()
        )

    def create_project(
        self, workspace_id: str, name: str, description: str | None
    ) -> dict[str, Any]:
        now = utc_now()
        project_id = str(uuid4())
        self.connection.execute(
            "INSERT INTO projects(id, workspace_id, name, description, status, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, 'active', ?, ?, NULL)",
            (project_id, workspace_id, name, description, now, now),
        )
        self.connection.commit()
        return self.get_project(workspace_id, project_id) or {}

    def update_project(
        self, workspace_id: str, project_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        if not values:
            return self.get_project(workspace_id, project_id)
        assignments = ', '.join(f'{key} = ?' for key in values)
        params = [*values.values(), utc_now(), workspace_id, project_id]
        self.connection.execute(
            f'UPDATE projects SET {assignments}, updated_at = ? WHERE workspace_id = ? AND id = ?',
            params,
        )
        self.connection.commit()
        return self.get_project(workspace_id, project_id)

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

    def get_decision(self, project_id: str, decision_id: str) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM decisions WHERE project_id = ? AND id = ?', (project_id, decision_id)
            ).fetchone()
        )

    def decision_revisions(self, project_id: str, decision_id: str) -> list[dict[str, Any]]:
        if self.get_decision(project_id, decision_id) is None:
            return []
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM decision_revisions WHERE decision_id = ? ORDER BY revision',
                (decision_id,),
            ).fetchall()
        ]

    def get_invariant(self, project_id: str, invariant_id: str) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM invariants WHERE project_id = ? AND id = ?',
                (project_id, invariant_id),
            ).fetchone()
        )

    def invariant_revisions(self, project_id: str, invariant_id: str) -> list[dict[str, Any]]:
        if self.get_invariant(project_id, invariant_id) is None:
            return []
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM invariant_revisions WHERE invariant_id = ? ORDER BY revision',
                (invariant_id,),
            ).fetchall()
        ]
