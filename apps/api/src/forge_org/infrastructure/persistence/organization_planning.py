"""OrganizationPlanningPersistence persistence methods."""

import sqlite3
from typing import Any
from uuid import uuid4

from ..connection import utc_now
from .common import row_dict


class OrganizationPlanningPersistence:
    connection: sqlite3.Connection

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
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM epics WHERE project_id = ? ORDER BY created_at', (project_id,)
            ).fetchall()
        ]

    def get_epic(self, project_id: str, epic_id: str) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM epics WHERE project_id = ? AND id = ?', (project_id, epic_id)
            ).fetchone()
        )

    def create_epic(self, project_id: str, title: str, description: str | None) -> dict[str, Any]:
        now, epic_id = utc_now(), str(uuid4())
        self.connection.execute(
            'INSERT INTO epics(id, project_id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            (epic_id, project_id, title, description, now, now),
        )
        self.connection.commit()
        return self.get_epic(project_id, epic_id) or {}

    def update_epic(
        self, project_id: str, epic_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        if not values:
            return self.get_epic(project_id, epic_id)
        assignments = ', '.join(f'{key} = ?' for key in values)
        self.connection.execute(
            f'UPDATE epics SET {assignments}, updated_at = ? WHERE project_id = ? AND id = ?',
            [*values.values(), utc_now(), project_id, epic_id],
        )
        self.connection.commit()
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
        return [
            dict(row)
            for row in self.connection.execute(
                f'SELECT * FROM features WHERE {" AND ".join(clauses)} ORDER BY created_at', params
            ).fetchall()
        ]

    def create_feature(self, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        now, feature_id = utc_now(), str(uuid4())
        self.connection.execute(
            'INSERT INTO features(id, project_id, epic_id, title, description, goal, priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                feature_id,
                project_id,
                values.get('epic_id'),
                values['title'],
                values.get('description'),
                values.get('goal'),
                values.get('priority', 'medium'),
                values.get('status', 'backlog'),
                now,
                now,
            ),
        )
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute(
                    'SELECT * FROM features WHERE id = ?', (feature_id,)
                ).fetchone()
            )
            or {}
        )

    def feature(self, project_id: str, feature_id: str) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM features WHERE project_id = ? AND id = ?', (project_id, feature_id)
            ).fetchone()
        )

    def update_feature(
        self, project_id: str, feature_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        if not values:
            return self.feature(project_id, feature_id)
        assignments = ', '.join(f'{key} = ?' for key in values)
        self.connection.execute(
            f'UPDATE features SET {assignments}, updated_at = ? WHERE project_id = ? AND id = ?',
            [*values.values(), utc_now(), project_id, feature_id],
        )
        self.connection.commit()
        return self.feature(project_id, feature_id)

    def create_criterion(
        self, feature_id: str, description: str, position: int = 0
    ) -> dict[str, Any]:
        now, criterion_id = utc_now(), str(uuid4())
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
        existing = [item['id'] for item in self.list_tasks(feature_id)]
        if len(ids) != len(existing) or set(ids) != set(existing):
            raise ValueError('Task reorder must include each task exactly once')
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

    def create_decision(self, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        now, decision_id = utc_now(), str(uuid4())
        self.connection.execute(
            'INSERT INTO decisions(id, project_id, title, context, decision, rationale, alternatives_considered, tradeoffs, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                decision_id,
                project_id,
                values['title'],
                values['context'],
                values['decision'],
                values['rationale'],
                values.get('alternatives_considered'),
                values.get('tradeoffs'),
                now,
                now,
            ),
        )
        self._snapshot_decision(decision_id, 1)
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute(
                    'SELECT * FROM decisions WHERE id = ?', (decision_id,)
                ).fetchone()
            )
            or {}
        )

    def _snapshot_decision(self, decision_id: str, revision: int) -> None:
        decision = self.connection.execute(
            'SELECT * FROM decisions WHERE id = ?', (decision_id,)
        ).fetchone()
        if decision is None:
            return
        self.connection.execute(
            'INSERT INTO decision_revisions(id, decision_id, revision, title, context, decision, rationale, alternatives_considered, tradeoffs, status, superseded_by_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                str(uuid4()),
                decision_id,
                revision,
                decision['title'],
                decision['context'],
                decision['decision'],
                decision['rationale'],
                decision['alternatives_considered'],
                decision['tradeoffs'],
                decision['status'],
                decision['superseded_by_id'],
                utc_now(),
            ),
        )

    def get_decision(self, project_id: str, decision_id: str) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM decisions WHERE project_id = ? AND id = ?', (project_id, decision_id)
            ).fetchone()
        )

    def list_decisions(self, project_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM decisions WHERE project_id = ? ORDER BY updated_at DESC',
                (project_id,),
            ).fetchall()
        ]

    def update_decision(
        self, project_id: str, decision_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        decision = self.get_decision(project_id, decision_id)
        if decision is None:
            return None
        values = {key: value for key, value in values.items() if value is not None}
        if values:
            assignments = ', '.join(f'{key} = ?' for key in values)
            revision = int(decision['revision']) + 1
            params = [*values.values(), revision, utc_now(), project_id, decision_id]
            self.connection.execute(
                f"UPDATE decisions SET {assignments}, revision = ?, status = 'proposed', updated_at = ? WHERE project_id = ? AND id = ?",
                params,
            )
            self._snapshot_decision(decision_id, revision)
            self.connection.commit()
        return self.get_decision(project_id, decision_id)

    def accept_decision(self, project_id: str, decision_id: str) -> dict[str, Any] | None:
        self.connection.execute(
            "UPDATE decisions SET status = 'accepted', updated_at = ? WHERE project_id = ? AND id = ?",
            (utc_now(), project_id, decision_id),
        )
        self.connection.commit()
        return self.get_decision(project_id, decision_id)

    def link_decision(self, decision_id: str, feature_id: str) -> None:
        self.connection.execute(
            'INSERT INTO decision_feature_links(decision_id, feature_id) VALUES (?, ?)',
            (decision_id, feature_id),
        )
        self.connection.commit()

    def feature_decisions(self, feature_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT d.* FROM decisions d JOIN decision_feature_links l ON l.decision_id = d.id WHERE l.feature_id = ? ORDER BY d.updated_at DESC',
                (feature_id,),
            ).fetchall()
        ]

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

    def create_invariant(self, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        now, invariant_id = utc_now(), str(uuid4())
        self.connection.execute(
            'INSERT INTO invariants(id, project_id, feature_id, title, statement, rationale, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (
                invariant_id,
                project_id,
                values.get('feature_id'),
                values['title'],
                values['statement'],
                values['rationale'],
                now,
                now,
            ),
        )
        self._snapshot_invariant(invariant_id, 1)
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute(
                    'SELECT * FROM invariants WHERE id = ?', (invariant_id,)
                ).fetchone()
            )
            or {}
        )

    def _snapshot_invariant(self, invariant_id: str, revision: int) -> None:
        item = self.connection.execute(
            'SELECT * FROM invariants WHERE id = ?', (invariant_id,)
        ).fetchone()
        if item is None:
            return
        self.connection.execute(
            'INSERT INTO invariant_revisions(id, invariant_id, revision, title, statement, rationale, status, feature_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                str(uuid4()),
                invariant_id,
                revision,
                item['title'],
                item['statement'],
                item['rationale'],
                item['status'],
                item['feature_id'],
                utc_now(),
            ),
        )

    def list_invariants(
        self, project_id: str, include_retired: bool = True
    ) -> list[dict[str, Any]]:
        clause = '' if include_retired else " AND status = 'active'"
        return [
            dict(row)
            for row in self.connection.execute(
                f'SELECT * FROM invariants WHERE project_id = ?{clause} ORDER BY updated_at DESC',
                (project_id,),
            ).fetchall()
        ]

    def get_invariant(self, project_id: str, invariant_id: str) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM invariants WHERE project_id = ? AND id = ?',
                (project_id, invariant_id),
            ).fetchone()
        )

    def update_invariant(
        self, project_id: str, invariant_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        item = self.get_invariant(project_id, invariant_id)
        if item is None:
            return None
        values = {key: value for key, value in values.items() if value is not None}
        assignments = ', '.join(f'{key} = ?' for key in values)
        revision = int(item['revision']) + 1
        self.connection.execute(
            f'UPDATE invariants SET {assignments}, revision = ?, updated_at = ? WHERE project_id = ? AND id = ?',
            [*values.values(), revision, utc_now(), project_id, invariant_id],
        )
        self._snapshot_invariant(invariant_id, revision)
        self.connection.commit()
        return self.get_invariant(project_id, invariant_id)

    def acknowledge(self, feature_id: str, invariant_id: str, revision: int) -> dict[str, Any]:
        now = utc_now()
        self.connection.execute(
            'INSERT INTO invariant_acknowledgements(feature_id, invariant_id, acknowledged_revision, acknowledged_at) VALUES (?, ?, ?, ?) ON CONFLICT(feature_id, invariant_id) DO UPDATE SET acknowledged_revision = excluded.acknowledged_revision, acknowledged_at = excluded.acknowledged_at',
            (feature_id, invariant_id, revision, now),
        )
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute(
                    'SELECT * FROM invariant_acknowledgements WHERE feature_id = ? AND invariant_id = ?',
                    (feature_id, invariant_id),
                ).fetchone()
            )
            or {}
        )

    def feature_invariants(self, project_id: str, feature_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                "SELECT i.*, a.acknowledged_revision FROM invariants i LEFT JOIN invariant_acknowledgements a ON a.invariant_id = i.id AND a.feature_id = ? WHERE i.project_id = ? AND i.status = 'active' AND (i.feature_id IS NULL OR i.feature_id = ?) ORDER BY i.updated_at DESC",
                (feature_id, project_id, feature_id),
            ).fetchall()
        ]

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

    def save_evaluation(self, values: dict[str, Any]) -> dict[str, Any]:
        evaluation_id = str(uuid4())
        self.connection.execute(
            'INSERT INTO readiness_evaluations(id, feature_id, evaluated_at, rule_set_version, input_fingerprint, outcome, passed_checks, failed_checks, blockers, results, input_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                evaluation_id,
                values['feature_id'],
                values['evaluated_at'],
                values['rule_set_version'],
                values['input_fingerprint'],
                values['outcome'],
                values['passed_checks'],
                values['failed_checks'],
                values['blockers'],
                values['results'],
                values['input_snapshot'],
            ),
        )
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute(
                    'SELECT * FROM readiness_evaluations WHERE id = ?', (evaluation_id,)
                ).fetchone()
            )
            or {}
        )

    def list_evaluations(self, feature_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM readiness_evaluations WHERE feature_id = ? ORDER BY evaluated_at DESC',
                (feature_id,),
            ).fetchall()
        ]
