import json
import os
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def database_path() -> Path:
    configured = os.environ.get("FORGE_DATABASE_PATH")
    return Path(configured) if configured else Path.cwd() / ".forge" / "forge.db"


def connect() -> sqlite3.Connection:
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    migrate(connection)
    return connection


def migrate(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY
        );
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS uq_workspaces_name_ci
            ON workspaces(lower(name));
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            archived_at TEXT
        );
        CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_workspace_name_ci
            ON projects(workspace_id, lower(name));
        CREATE TABLE IF NOT EXISTS epics (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            title TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'planning',
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS features (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            epic_id TEXT REFERENCES epics(id) ON DELETE SET NULL, title TEXT NOT NULL,
            description TEXT, goal TEXT, priority TEXT NOT NULL DEFAULT 'medium',
            status TEXT NOT NULL DEFAULT 'backlog', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS ix_features_project ON features(project_id, status, priority);
        CREATE TABLE IF NOT EXISTS acceptance_criteria (
            id TEXT PRIMARY KEY, feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            description TEXT NOT NULL, satisfied INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY, feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            title TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'todo', position INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS feature_dependencies (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            blocking_feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            blocked_feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            UNIQUE(blocking_feature_id, blocked_feature_id)
        );
        CREATE TABLE IF NOT EXISTS decisions (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            title TEXT NOT NULL, context TEXT NOT NULL, decision TEXT NOT NULL, rationale TEXT NOT NULL,
            alternatives_considered TEXT, tradeoffs TEXT, status TEXT NOT NULL DEFAULT 'proposed',
            revision INTEGER NOT NULL DEFAULT 1, superseded_by_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS decision_revisions (
            id TEXT PRIMARY KEY, decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
            revision INTEGER NOT NULL, title TEXT NOT NULL, context TEXT NOT NULL, decision TEXT NOT NULL,
            rationale TEXT NOT NULL, alternatives_considered TEXT, tradeoffs TEXT, status TEXT NOT NULL,
            superseded_by_id TEXT, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS decision_feature_links (
            decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
            feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            PRIMARY KEY(decision_id, feature_id)
        );
        CREATE TABLE IF NOT EXISTS invariants (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            feature_id TEXT REFERENCES features(id) ON DELETE CASCADE, title TEXT NOT NULL,
            statement TEXT NOT NULL, rationale TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
            revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS invariant_revisions (
            id TEXT PRIMARY KEY, invariant_id TEXT NOT NULL REFERENCES invariants(id) ON DELETE CASCADE,
            revision INTEGER NOT NULL, title TEXT NOT NULL, statement TEXT NOT NULL, rationale TEXT NOT NULL,
            status TEXT NOT NULL, feature_id TEXT, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS invariant_acknowledgements (
            feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            invariant_id TEXT NOT NULL REFERENCES invariants(id) ON DELETE CASCADE,
            acknowledged_revision INTEGER NOT NULL, acknowledged_at TEXT NOT NULL,
            PRIMARY KEY(feature_id, invariant_id)
        );
        CREATE TABLE IF NOT EXISTS readiness_evaluations (
            id TEXT PRIMARY KEY, feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            evaluated_at TEXT NOT NULL, rule_set_version TEXT NOT NULL, input_fingerprint TEXT NOT NULL,
            outcome TEXT NOT NULL, passed_checks TEXT NOT NULL, failed_checks TEXT NOT NULL,
            blockers TEXT NOT NULL, results TEXT NOT NULL, input_snapshot TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS repositories (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            root_path TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'connected', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            UNIQUE(project_id, root_path)
        );
        CREATE TABLE IF NOT EXISTS git_observations (
            id TEXT PRIMARY KEY, repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
            observed_at TEXT NOT NULL, head_sha TEXT, branch TEXT, detached INTEGER NOT NULL DEFAULT 0,
            unborn INTEGER NOT NULL DEFAULT 0, clean INTEGER, tracked_modified_count INTEGER NOT NULL DEFAULT 0,
            staged_count INTEGER NOT NULL DEFAULT 0, untracked_count INTEGER NOT NULL DEFAULT 0,
            observer_version TEXT NOT NULL, status TEXT NOT NULL, error_code TEXT, source_content_read INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS feature_repository_links (
            feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
            PRIMARY KEY(feature_id, repository_id)
        );
        CREATE TABLE IF NOT EXISTS context_packages (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            schema_version TEXT NOT NULL, fingerprint TEXT NOT NULL, payload_json TEXT NOT NULL,
            markdown TEXT NOT NULL, created_at TEXT NOT NULL,
            UNIQUE(feature_id, schema_version, fingerprint)
        );
        CREATE TABLE IF NOT EXISTS runs (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            feature_id TEXT REFERENCES features(id) ON DELETE SET NULL, context_package_id TEXT,
            title TEXT NOT NULL, description TEXT, execution_mode TEXT NOT NULL DEFAULT 'manual',
            executor_type TEXT NOT NULL DEFAULT 'human', executor_label TEXT, status TEXT NOT NULL DEFAULT 'PLANNED',
            version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS run_events (
            id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
            event_type TEXT NOT NULL, title TEXT NOT NULL, description TEXT, origin TEXT NOT NULL DEFAULT 'manual',
            occurred_at TEXT, supersedes_event_id TEXT, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS handoffs (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            feature_id TEXT REFERENCES features(id) ON DELETE SET NULL, run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
            context_package_id TEXT, title TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', next_actions TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'DRAFT', current_revision INTEGER, version INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS handoff_revisions (
            id TEXT PRIMARY KEY, handoff_id TEXT NOT NULL REFERENCES handoffs(id) ON DELETE CASCADE,
            revision INTEGER NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, next_actions TEXT NOT NULL,
            schema_version TEXT NOT NULL, fingerprint TEXT NOT NULL, payload_json TEXT NOT NULL, markdown TEXT NOT NULL, created_at TEXT NOT NULL,
            UNIQUE(handoff_id, revision)
        );
        CREATE TABLE IF NOT EXISTS handoff_acknowledgements (
            id TEXT PRIMARY KEY, handoff_id TEXT NOT NULL REFERENCES handoffs(id) ON DELETE CASCADE,
            revision INTEGER NOT NULL, acknowledged_by TEXT NOT NULL, acknowledged_at TEXT NOT NULL,
            UNIQUE(handoff_id, revision)
        );
        CREATE TABLE IF NOT EXISTS evidence (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            feature_id TEXT REFERENCES features(id) ON DELETE SET NULL, title TEXT NOT NULL, summary TEXT NOT NULL,
            provenance TEXT NOT NULL, reference_kind TEXT NOT NULL, reference_value TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'ACTIVE', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS release_candidates (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            title TEXT NOT NULL, summary TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'DRAFT', revision INTEGER NOT NULL DEFAULT 1,
            fingerprint TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS release_candidate_revisions (
            id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES release_candidates(id) ON DELETE CASCADE,
            revision INTEGER NOT NULL, status TEXT NOT NULL, snapshot_json TEXT NOT NULL, fingerprint TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS gate_evaluations (
            id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES release_candidates(id) ON DELETE CASCADE,
            candidate_revision INTEGER NOT NULL, outcome TEXT NOT NULL, input_fingerprint TEXT NOT NULL,
            blockers TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS verification_evaluations (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            rule_id TEXT NOT NULL, candidate_id TEXT REFERENCES release_candidates(id) ON DELETE SET NULL,
            outcome TEXT NOT NULL, input_fingerprint TEXT NOT NULL, blockers TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS release_manifests (
            id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES release_candidates(id) ON DELETE CASCADE,
            gate_evaluation_id TEXT NOT NULL REFERENCES gate_evaluations(id) ON DELETE RESTRICT,
            schema_version TEXT NOT NULL, fingerprint TEXT NOT NULL, status TEXT NOT NULL,
            payload_json TEXT NOT NULL, markdown TEXT NOT NULL, created_at TEXT NOT NULL,
            UNIQUE(candidate_id, gate_evaluation_id)
        );
        INSERT OR IGNORE INTO schema_version(version) VALUES (1);
        """
    )
    connection.commit()


def row_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row is not None else None


class OrganizationRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def list_workspaces(self) -> list[dict[str, Any]]:
        rows = self.connection.execute(
            "SELECT * FROM workspaces ORDER BY lower(name), created_at"
        ).fetchall()
        return [dict(row) for row in rows]

    def get_workspace(self, workspace_id: str) -> dict[str, Any] | None:
        return row_dict(self.connection.execute("SELECT * FROM workspaces WHERE id = ?", (workspace_id,)).fetchone())

    def create_workspace(self, name: str, description: str | None) -> dict[str, Any]:
        now = utc_now()
        workspace_id = str(uuid4())
        self.connection.execute(
            "INSERT INTO workspaces(id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (workspace_id, name, description, now, now),
        )
        self.connection.commit()
        return self.get_workspace(workspace_id) or {}

    def update_workspace(self, workspace_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
        if not values:
            return self.get_workspace(workspace_id)
        assignments = ", ".join(f"{key} = ?" for key in values)
        params = [*values.values(), utc_now(), workspace_id]
        self.connection.execute(f"UPDATE workspaces SET {assignments}, updated_at = ? WHERE id = ?", params)
        self.connection.commit()
        return self.get_workspace(workspace_id)

    def workspace_projects(self, workspace_id: str, search: str | None, status: str) -> list[dict[str, Any]]:
        clauses = ["workspace_id = ?"]
        params: list[Any] = [workspace_id]
        if search:
            clauses.append("(lower(name) LIKE ? OR lower(coalesce(description, '')) LIKE ?)")
            term = f"%{search.strip().lower()}%"
            params.extend([term, term])
        if status != "all":
            clauses.append("status = ?")
            params.append(status)
        rows = self.connection.execute(
            f"SELECT * FROM projects WHERE {' AND '.join(clauses)} ORDER BY lower(name), created_at", params
        ).fetchall()
        return [dict(row) for row in rows]

    def get_project(self, workspace_id: str, project_id: str) -> dict[str, Any] | None:
        return row_dict(self.connection.execute(
            "SELECT * FROM projects WHERE workspace_id = ? AND id = ?", (workspace_id, project_id)
        ).fetchone())

    def create_project(self, workspace_id: str, name: str, description: str | None) -> dict[str, Any]:
        now = utc_now()
        project_id = str(uuid4())
        self.connection.execute(
            "INSERT INTO projects(id, workspace_id, name, description, status, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, 'active', ?, ?, NULL)",
            (project_id, workspace_id, name, description, now, now),
        )
        self.connection.commit()
        return self.get_project(workspace_id, project_id) or {}

    def update_project(self, workspace_id: str, project_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
        if not values:
            return self.get_project(workspace_id, project_id)
        assignments = ", ".join(f"{key} = ?" for key in values)
        params = [*values.values(), utc_now(), workspace_id, project_id]
        self.connection.execute(
            f"UPDATE projects SET {assignments}, updated_at = ? WHERE workspace_id = ? AND id = ?", params
        )
        self.connection.commit()
        return self.get_project(workspace_id, project_id)

    def list_epics(self, project_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute('SELECT * FROM epics WHERE project_id = ? ORDER BY created_at', (project_id,)).fetchall()]

    def get_epic(self, project_id: str, epic_id: str) -> dict[str, Any] | None:
        return row_dict(self.connection.execute('SELECT * FROM epics WHERE project_id = ? AND id = ?', (project_id, epic_id)).fetchone())

    def create_epic(self, project_id: str, title: str, description: str | None) -> dict[str, Any]:
        now, epic_id = utc_now(), str(uuid4())
        self.connection.execute('INSERT INTO epics(id, project_id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', (epic_id, project_id, title, description, now, now))
        self.connection.commit()
        return self.get_epic(project_id, epic_id) or {}

    def update_epic(self, project_id: str, epic_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
        if not values: return self.get_epic(project_id, epic_id)
        assignments = ', '.join(f'{key} = ?' for key in values)
        self.connection.execute(f'UPDATE epics SET {assignments}, updated_at = ? WHERE project_id = ? AND id = ?', [*values.values(), utc_now(), project_id, epic_id])
        self.connection.commit()
        return self.get_epic(project_id, epic_id)

    def list_features(self, project_id: str, search: str | None, status: str | None, priority: str | None, epic_id: str | None) -> list[dict[str, Any]]:
        clauses, params = ['project_id = ?'], [project_id]
        if search:
            clauses.append('(lower(title) LIKE ? OR lower(coalesce(description, \'\')) LIKE ?)'); term = f'%{search.strip().lower()}%'; params.extend([term, term])
        if status: clauses.append('status = ?'); params.append(status)
        if priority: clauses.append('priority = ?'); params.append(priority)
        if epic_id: clauses.append('epic_id = ?'); params.append(epic_id)
        return [dict(row) for row in self.connection.execute(f"SELECT * FROM features WHERE {' AND '.join(clauses)} ORDER BY created_at", params).fetchall()]

    def create_feature(self, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        now, feature_id = utc_now(), str(uuid4())
        self.connection.execute('INSERT INTO features(id, project_id, epic_id, title, description, goal, priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (feature_id, project_id, values.get('epic_id'), values['title'], values.get('description'), values.get('goal'), values.get('priority', 'medium'), values.get('status', 'backlog'), now, now))
        self.connection.commit()
        return row_dict(self.connection.execute('SELECT * FROM features WHERE id = ?', (feature_id,)).fetchone()) or {}

    def feature(self, project_id: str, feature_id: str) -> dict[str, Any] | None:
        return row_dict(self.connection.execute('SELECT * FROM features WHERE project_id = ? AND id = ?', (project_id, feature_id)).fetchone())

    def update_feature(self, project_id: str, feature_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
        if not values: return self.feature(project_id, feature_id)
        assignments = ', '.join(f'{key} = ?' for key in values)
        self.connection.execute(f'UPDATE features SET {assignments}, updated_at = ? WHERE project_id = ? AND id = ?', [*values.values(), utc_now(), project_id, feature_id])
        self.connection.commit()
        return self.feature(project_id, feature_id)

    def create_criterion(self, feature_id: str, description: str, position: int = 0) -> dict[str, Any]:
        now, criterion_id = utc_now(), str(uuid4())
        self.connection.execute('INSERT INTO acceptance_criteria(id, feature_id, description, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', (criterion_id, feature_id, description.strip(), position, now, now))
        self.connection.commit()
        return row_dict(self.connection.execute('SELECT * FROM acceptance_criteria WHERE id = ?', (criterion_id,)).fetchone()) or {}

    def list_criteria(self, feature_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute('SELECT * FROM acceptance_criteria WHERE feature_id = ? ORDER BY position, id', (feature_id,)).fetchall()]

    def update_criterion(self, feature_id: str, criterion_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
        item = row_dict(self.connection.execute('SELECT * FROM acceptance_criteria WHERE feature_id = ? AND id = ?', (feature_id, criterion_id)).fetchone())
        if item is None: return None
        assignments = ', '.join(f'{key} = ?' for key in values)
        self.connection.execute(f'UPDATE acceptance_criteria SET {assignments}, updated_at = ? WHERE feature_id = ? AND id = ?', [*values.values(), utc_now(), feature_id, criterion_id]); self.connection.commit()
        return row_dict(self.connection.execute('SELECT * FROM acceptance_criteria WHERE id = ?', (criterion_id,)).fetchone())

    def create_task(self, feature_id: str, values: dict[str, Any]) -> dict[str, Any]:
        now, task_id = utc_now(), str(uuid4())
        self.connection.execute('INSERT INTO tasks(id, feature_id, title, description, status, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', (task_id, feature_id, values['title'], values.get('description'), values.get('status', 'todo'), values.get('position', 0), now, now)); self.connection.commit()
        return row_dict(self.connection.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone()) or {}

    def list_tasks(self, feature_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute('SELECT * FROM tasks WHERE feature_id = ? ORDER BY position, created_at', (feature_id,)).fetchall()]

    def update_task(self, feature_id: str, task_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
        item = row_dict(self.connection.execute('SELECT * FROM tasks WHERE feature_id = ? AND id = ?', (feature_id, task_id)).fetchone())
        if item is None: return None
        if not values: return item
        assignments = ', '.join(f'{key} = ?' for key in values)
        self.connection.execute(f'UPDATE tasks SET {assignments}, updated_at = ? WHERE feature_id = ? AND id = ?', [*values.values(), utc_now(), feature_id, task_id])
        self.connection.commit()
        return row_dict(self.connection.execute('SELECT * FROM tasks WHERE id = ?', (task_id,)).fetchone())

    def reorder_tasks(self, feature_id: str, ids: list[str]) -> list[dict[str, Any]]:
        existing = [item['id'] for item in self.list_tasks(feature_id)]
        if len(ids) != len(existing) or set(ids) != set(existing):
            raise ValueError('Task reorder must include each task exactly once')
        now = utc_now()
        for position, task_id in enumerate(ids):
            self.connection.execute('UPDATE tasks SET position = ?, updated_at = ? WHERE feature_id = ? AND id = ?', (position, now, feature_id, task_id))
        self.connection.commit()
        return self.list_tasks(feature_id)

    def create_dependency(self, project_id: str, blocking_feature_id: str, blocked_feature_id: str) -> dict[str, Any]:
        now, dependency_id = utc_now(), str(uuid4())
        self.connection.execute('INSERT INTO feature_dependencies(id, project_id, blocking_feature_id, blocked_feature_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', (dependency_id, project_id, blocking_feature_id, blocked_feature_id, now, now)); self.connection.commit()
        return row_dict(self.connection.execute('SELECT * FROM feature_dependencies WHERE id = ?', (dependency_id,)).fetchone()) or {}

    def list_dependencies(self, project_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute('SELECT * FROM feature_dependencies WHERE project_id = ? ORDER BY created_at', (project_id,)).fetchall()]

    def delete_dependency(self, project_id: str, dependency_id: str) -> bool:
        cursor = self.connection.execute('DELETE FROM feature_dependencies WHERE project_id = ? AND id = ?', (project_id, dependency_id))
        self.connection.commit()
        return cursor.rowcount == 1

    def create_decision(self, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        now, decision_id = utc_now(), str(uuid4())
        self.connection.execute('INSERT INTO decisions(id, project_id, title, context, decision, rationale, alternatives_considered, tradeoffs, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (decision_id, project_id, values['title'], values['context'], values['decision'], values['rationale'], values.get('alternatives_considered'), values.get('tradeoffs'), now, now))
        self._snapshot_decision(decision_id, 1)
        self.connection.commit()
        return row_dict(self.connection.execute('SELECT * FROM decisions WHERE id = ?', (decision_id,)).fetchone()) or {}

    def _snapshot_decision(self, decision_id: str, revision: int) -> None:
        decision = self.connection.execute('SELECT * FROM decisions WHERE id = ?', (decision_id,)).fetchone()
        if decision is None: return
        self.connection.execute('INSERT INTO decision_revisions(id, decision_id, revision, title, context, decision, rationale, alternatives_considered, tradeoffs, status, superseded_by_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (str(uuid4()), decision_id, revision, decision['title'], decision['context'], decision['decision'], decision['rationale'], decision['alternatives_considered'], decision['tradeoffs'], decision['status'], decision['superseded_by_id'], utc_now()))

    def get_decision(self, project_id: str, decision_id: str) -> dict[str, Any] | None:
        return row_dict(self.connection.execute('SELECT * FROM decisions WHERE project_id = ? AND id = ?', (project_id, decision_id)).fetchone())

    def list_decisions(self, project_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute('SELECT * FROM decisions WHERE project_id = ? ORDER BY updated_at DESC', (project_id,)).fetchall()]

    def update_decision(self, project_id: str, decision_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
        decision = self.get_decision(project_id, decision_id)
        if decision is None: return None
        values = {key: value for key, value in values.items() if value is not None}
        if values:
            assignments = ', '.join(f'{key} = ?' for key in values)
            revision = int(decision['revision']) + 1
            params = [*values.values(), revision, utc_now(), project_id, decision_id]
            self.connection.execute(f'UPDATE decisions SET {assignments}, revision = ?, status = \'proposed\', updated_at = ? WHERE project_id = ? AND id = ?', params)
            self._snapshot_decision(decision_id, revision)
            self.connection.commit()
        return self.get_decision(project_id, decision_id)

    def accept_decision(self, project_id: str, decision_id: str) -> dict[str, Any] | None:
        self.connection.execute("UPDATE decisions SET status = 'accepted', updated_at = ? WHERE project_id = ? AND id = ?", (utc_now(), project_id, decision_id))
        self.connection.commit()
        return self.get_decision(project_id, decision_id)

    def link_decision(self, decision_id: str, feature_id: str) -> None:
        self.connection.execute('INSERT INTO decision_feature_links(decision_id, feature_id) VALUES (?, ?)', (decision_id, feature_id)); self.connection.commit()

    def feature_decisions(self, feature_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute('SELECT d.* FROM decisions d JOIN decision_feature_links l ON l.decision_id = d.id WHERE l.feature_id = ? ORDER BY d.updated_at DESC', (feature_id,)).fetchall()]

    def decision_revisions(self, project_id: str, decision_id: str) -> list[dict[str, Any]]:
        if self.get_decision(project_id, decision_id) is None: return []
        return [dict(row) for row in self.connection.execute('SELECT * FROM decision_revisions WHERE decision_id = ? ORDER BY revision', (decision_id,)).fetchall()]

    def create_invariant(self, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        now, invariant_id = utc_now(), str(uuid4())
        self.connection.execute('INSERT INTO invariants(id, project_id, feature_id, title, statement, rationale, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', (invariant_id, project_id, values.get('feature_id'), values['title'], values['statement'], values['rationale'], now, now))
        self._snapshot_invariant(invariant_id, 1); self.connection.commit()
        return row_dict(self.connection.execute('SELECT * FROM invariants WHERE id = ?', (invariant_id,)).fetchone()) or {}

    def _snapshot_invariant(self, invariant_id: str, revision: int) -> None:
        item = self.connection.execute('SELECT * FROM invariants WHERE id = ?', (invariant_id,)).fetchone()
        if item is None: return
        self.connection.execute('INSERT INTO invariant_revisions(id, invariant_id, revision, title, statement, rationale, status, feature_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', (str(uuid4()), invariant_id, revision, item['title'], item['statement'], item['rationale'], item['status'], item['feature_id'], utc_now()))

    def list_invariants(self, project_id: str, include_retired: bool = True) -> list[dict[str, Any]]:
        clause = '' if include_retired else " AND status = 'active'"
        return [dict(row) for row in self.connection.execute(f'SELECT * FROM invariants WHERE project_id = ?{clause} ORDER BY updated_at DESC', (project_id,)).fetchall()]

    def get_invariant(self, project_id: str, invariant_id: str) -> dict[str, Any] | None:
        return row_dict(self.connection.execute('SELECT * FROM invariants WHERE project_id = ? AND id = ?', (project_id, invariant_id)).fetchone())

    def update_invariant(self, project_id: str, invariant_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
        item = self.get_invariant(project_id, invariant_id)
        if item is None: return None
        values = {key: value for key, value in values.items() if value is not None}
        assignments = ', '.join(f'{key} = ?' for key in values)
        revision = int(item['revision']) + 1
        self.connection.execute(f'UPDATE invariants SET {assignments}, revision = ?, updated_at = ? WHERE project_id = ? AND id = ?', [*values.values(), revision, utc_now(), project_id, invariant_id])
        self._snapshot_invariant(invariant_id, revision); self.connection.commit()
        return self.get_invariant(project_id, invariant_id)

    def acknowledge(self, feature_id: str, invariant_id: str, revision: int) -> dict[str, Any]:
        now = utc_now()
        self.connection.execute('INSERT INTO invariant_acknowledgements(feature_id, invariant_id, acknowledged_revision, acknowledged_at) VALUES (?, ?, ?, ?) ON CONFLICT(feature_id, invariant_id) DO UPDATE SET acknowledged_revision = excluded.acknowledged_revision, acknowledged_at = excluded.acknowledged_at', (feature_id, invariant_id, revision, now)); self.connection.commit()
        return row_dict(self.connection.execute('SELECT * FROM invariant_acknowledgements WHERE feature_id = ? AND invariant_id = ?', (feature_id, invariant_id)).fetchone()) or {}

    def feature_invariants(self, project_id: str, feature_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute("SELECT i.*, a.acknowledged_revision FROM invariants i LEFT JOIN invariant_acknowledgements a ON a.invariant_id = i.id AND a.feature_id = ? WHERE i.project_id = ? AND i.status = 'active' AND (i.feature_id IS NULL OR i.feature_id = ?) ORDER BY i.updated_at DESC", (feature_id, project_id, feature_id)).fetchall()]

    def invariant_revisions(self, project_id: str, invariant_id: str) -> list[dict[str, Any]]:
        if self.get_invariant(project_id, invariant_id) is None: return []
        return [dict(row) for row in self.connection.execute('SELECT * FROM invariant_revisions WHERE invariant_id = ? ORDER BY revision', (invariant_id,)).fetchall()]

    def save_evaluation(self, values: dict[str, Any]) -> dict[str, Any]:
        evaluation_id = str(uuid4()); self.connection.execute('INSERT INTO readiness_evaluations(id, feature_id, evaluated_at, rule_set_version, input_fingerprint, outcome, passed_checks, failed_checks, blockers, results, input_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (evaluation_id, values['feature_id'], values['evaluated_at'], values['rule_set_version'], values['input_fingerprint'], values['outcome'], values['passed_checks'], values['failed_checks'], values['blockers'], values['results'], values['input_snapshot'])); self.connection.commit()
        return row_dict(self.connection.execute('SELECT * FROM readiness_evaluations WHERE id = ?', (evaluation_id,)).fetchone()) or {}

    def list_evaluations(self, feature_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute('SELECT * FROM readiness_evaluations WHERE feature_id = ? ORDER BY evaluated_at DESC', (feature_id,)).fetchall()]

    def create_repository(self, project_id: str, root_path: str) -> dict[str, Any]:
        now, repository_id = utc_now(), str(uuid4())
        self.connection.execute('INSERT INTO repositories(id, project_id, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', (repository_id, project_id, root_path, now, now)); self.connection.commit()
        return row_dict(self.connection.execute('SELECT * FROM repositories WHERE id = ?', (repository_id,)).fetchone()) or {}

    def list_repositories(self, project_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute('SELECT * FROM repositories WHERE project_id = ? ORDER BY root_path', (project_id,)).fetchall()]

    def get_repository(self, project_id: str, repository_id: str) -> dict[str, Any] | None:
        return row_dict(self.connection.execute('SELECT * FROM repositories WHERE project_id = ? AND id = ?', (project_id, repository_id)).fetchone())

    def disconnect_repository(self, project_id: str, repository_id: str) -> dict[str, Any] | None:
        self.connection.execute("UPDATE repositories SET status = 'disconnected', updated_at = ? WHERE project_id = ? AND id = ?", (utc_now(), project_id, repository_id)); self.connection.commit(); return self.get_repository(project_id, repository_id)

    def create_observation(self, values: dict[str, Any]) -> dict[str, Any]:
        observation_id = str(uuid4())
        self.connection.execute('INSERT INTO git_observations(id, repository_id, observed_at, head_sha, branch, detached, unborn, clean, tracked_modified_count, staged_count, untracked_count, observer_version, status, error_code, source_content_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (observation_id, values['repository_id'], values['observed_at'], values.get('head_sha'), values.get('branch'), values.get('detached', False), values.get('unborn', False), values.get('clean'), values.get('tracked_modified_count', 0), values.get('staged_count', 0), values.get('untracked_count', 0), values['observer_version'], values['status'], values.get('error_code'), False)); self.connection.commit()
        return row_dict(self.connection.execute('SELECT * FROM git_observations WHERE id = ?', (observation_id,)).fetchone()) or {}

    def list_observations(self, repository_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute('SELECT * FROM git_observations WHERE repository_id = ? ORDER BY observed_at DESC, id DESC', (repository_id,)).fetchall()]

    def link_repository(self, feature_id: str, repository_id: str) -> dict[str, Any]:
        self.connection.execute('INSERT INTO feature_repository_links(feature_id, repository_id) VALUES (?, ?)', (feature_id, repository_id)); self.connection.commit()
        return {'feature_id': feature_id, 'repository_id': repository_id}

    def feature_repositories(self, feature_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute('SELECT r.* FROM repositories r JOIN feature_repository_links l ON l.repository_id = r.id WHERE l.feature_id = ?', (feature_id,)).fetchall()]

    def unlink_repository(self, feature_id: str, repository_id: str) -> bool:
        cursor = self.connection.execute('DELETE FROM feature_repository_links WHERE feature_id = ? AND repository_id = ?', (feature_id, repository_id))
        self.connection.commit()
        return cursor.rowcount == 1

    def find_context_package(self, feature_id: str, schema_version: str, fingerprint: str) -> dict[str, Any] | None:
        return row_dict(self.connection.execute('SELECT * FROM context_packages WHERE feature_id = ? AND schema_version = ? AND fingerprint = ?', (feature_id, schema_version, fingerprint)).fetchone())

    def save_context_package(self, values: dict[str, Any]) -> dict[str, Any]:
        existing = self.find_context_package(values['feature_id'], values['schema_version'], values['fingerprint'])
        if existing is not None: return existing
        package_id = str(uuid4())
        self.connection.execute('INSERT INTO context_packages(id, project_id, feature_id, schema_version, fingerprint, payload_json, markdown, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', (package_id, values['project_id'], values['feature_id'], values['schema_version'], values['fingerprint'], values['payload_json'], values['markdown'], utc_now())); self.connection.commit()
        return row_dict(self.connection.execute('SELECT * FROM context_packages WHERE id = ?', (package_id,)).fetchone()) or {}

    def list_context_packages(self, feature_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute('SELECT * FROM context_packages WHERE feature_id = ? ORDER BY created_at DESC, id DESC', (feature_id,)).fetchall()]

    def get_context_package(self, feature_id: str, package_id: str) -> dict[str, Any] | None:
        return row_dict(self.connection.execute('SELECT * FROM context_packages WHERE feature_id = ? AND id = ?', (feature_id, package_id)).fetchone())

    def create_run(self, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        now, run_id = utc_now(), str(uuid4())
        self.connection.execute('INSERT INTO runs(id, project_id, feature_id, context_package_id, title, description, execution_mode, executor_type, executor_label, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (run_id, project_id, values.get('feature_id'), values.get('context_package_id'), values['title'], values.get('description'), values.get('execution_mode', 'manual'), values.get('executor_type', 'human'), values.get('executor_label'), now, now)); self.connection.commit()
        return row_dict(self.connection.execute('SELECT * FROM runs WHERE id = ?', (run_id,)).fetchone()) or {}

    def get_run(self, project_id: str, run_id: str) -> dict[str, Any] | None:
        return row_dict(self.connection.execute('SELECT * FROM runs WHERE project_id = ? AND id = ?', (project_id, run_id)).fetchone())

    def update_run(self, project_id: str, run_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
        if not values:
            self.connection.execute('UPDATE runs SET version = version + 1, updated_at = ? WHERE project_id = ? AND id = ?', (utc_now(), project_id, run_id)); self.connection.commit(); return self.get_run(project_id, run_id)
        assignments = ', '.join(f'{key} = ?' for key in values)
        self.connection.execute(f'UPDATE runs SET {assignments}, version = version + 1, updated_at = ? WHERE project_id = ? AND id = ?', [*values.values(), utc_now(), project_id, run_id]); self.connection.commit(); return self.get_run(project_id, run_id)

    def list_runs(self, project_id: str, feature_id: str | None = None, status: str | None = None, search: str | None = None) -> list[dict[str, Any]]:
        clauses, params = ['project_id = ?'], [project_id]
        if feature_id: clauses.append('feature_id = ?'); params.append(feature_id)
        if status: clauses.append('status = ?'); params.append(status)
        if search: clauses.append('(lower(title) LIKE ? OR lower(coalesce(description, \'\')) LIKE ?)'); term = f'%{search.strip().lower()}%'; params.extend([term, term])
        return [dict(row) for row in self.connection.execute(f"SELECT * FROM runs WHERE {' AND '.join(clauses)} ORDER BY created_at DESC", params).fetchall()]

    def create_event(self, run_id: str, values: dict[str, Any]) -> dict[str, Any]:
        event_id = str(uuid4()); self.connection.execute('INSERT INTO run_events(id, run_id, event_type, title, description, occurred_at, supersedes_event_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', (event_id, run_id, values['event_type'], values['title'], values.get('description'), values.get('occurred_at'), values.get('supersedes_event_id'), utc_now())); self.connection.commit(); return row_dict(self.connection.execute('SELECT * FROM run_events WHERE id = ?', (event_id,)).fetchone()) or {}

    def list_events(self, run_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute('SELECT * FROM run_events WHERE run_id = ? ORDER BY created_at', (run_id,)).fetchall()]

    def create_handoff(self, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        now, handoff_id = utc_now(), str(uuid4()); self.connection.execute('INSERT INTO handoffs(id, project_id, feature_id, run_id, context_package_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', (handoff_id, project_id, values.get('feature_id'), values['run_id'], values.get('context_package_id'), now, now)); self.connection.commit(); return row_dict(self.connection.execute('SELECT * FROM handoffs WHERE id = ?', (handoff_id,)).fetchone()) or {}

    def get_handoff(self, project_id: str, handoff_id: str) -> dict[str, Any] | None:
        return row_dict(self.connection.execute('SELECT * FROM handoffs WHERE project_id = ? AND id = ?', (project_id, handoff_id)).fetchone())
    def list_handoffs(self, project_id: str) -> list[dict[str, Any]]: return [dict(row) for row in self.connection.execute('SELECT * FROM handoffs WHERE project_id = ? ORDER BY updated_at DESC', (project_id,)).fetchall()]

    def update_handoff(self, project_id: str, handoff_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
        assignments = ', '.join(f'{key} = ?' for key in values); self.connection.execute(f'UPDATE handoffs SET {assignments}, version = version + 1, updated_at = ? WHERE project_id = ? AND id = ?', [*values.values(), utc_now(), project_id, handoff_id]); self.connection.commit(); return self.get_handoff(project_id, handoff_id)

    def create_handoff_revision(self, values: dict[str, Any]) -> dict[str, Any]:
        revision_id = str(uuid4()); self.connection.execute('INSERT INTO handoff_revisions(id, handoff_id, revision, title, summary, next_actions, schema_version, fingerprint, payload_json, markdown, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (revision_id, values['handoff_id'], values['revision'], values['title'], values['summary'], values['next_actions'], values['schema_version'], values['fingerprint'], values['payload_json'], values['markdown'], utc_now())); self.connection.commit(); return row_dict(self.connection.execute('SELECT * FROM handoff_revisions WHERE id = ?', (revision_id,)).fetchone()) or {}

    def list_handoff_revisions(self, handoff_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute('SELECT * FROM handoff_revisions WHERE handoff_id = ? ORDER BY revision', (handoff_id,)).fetchall()]

    def get_handoff_revision(self, handoff_id: str, revision: int) -> dict[str, Any] | None:
        return row_dict(self.connection.execute('SELECT * FROM handoff_revisions WHERE handoff_id = ? AND revision = ?', (handoff_id, revision)).fetchone())

    def acknowledge_handoff(self, handoff_id: str, revision: int, acknowledged_by: str) -> dict[str, Any]:
        item = {'id': str(uuid4()), 'handoff_id': handoff_id, 'revision': revision, 'acknowledged_by': acknowledged_by, 'acknowledged_at': utc_now()}; self.connection.execute('INSERT INTO handoff_acknowledgements(id, handoff_id, revision, acknowledged_by, acknowledged_at) VALUES (?, ?, ?, ?, ?)', tuple(item.values())); self.connection.commit(); return item

    def create_evidence(self, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        now, item_id = utc_now(), str(uuid4()); self.connection.execute('INSERT INTO evidence(id, project_id, feature_id, title, summary, provenance, reference_kind, reference_value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (item_id, project_id, values.get('feature_id'), values['title'], values['summary'], values['provenance'], values['reference_kind'], values['reference_value'], now, now)); self.connection.commit(); return row_dict(self.connection.execute('SELECT * FROM evidence WHERE id = ?', (item_id,)).fetchone()) or {}
    def get_evidence(self, project_id: str, evidence_id: str) -> dict[str, Any] | None: return row_dict(self.connection.execute('SELECT * FROM evidence WHERE project_id = ? AND id = ?', (project_id, evidence_id)).fetchone())
    def update_evidence(self, project_id: str, evidence_id: str, status: str) -> dict[str, Any] | None:
        self.connection.execute('UPDATE evidence SET status = ?, updated_at = ? WHERE project_id = ? AND id = ?', (status, utc_now(), project_id, evidence_id)); self.connection.commit(); return self.get_evidence(project_id, evidence_id)
    def list_evidence(self, project_id: str, search: str | None = None, provenance: str | None = None, status: str | None = None) -> list[dict[str, Any]]:
        clauses, params = ['project_id = ?'], [project_id]
        if search: clauses.append('(lower(title) LIKE ? OR lower(summary) LIKE ?)'); term = f'%{search.strip().lower()}%'; params.extend([term, term])
        if provenance: clauses.append('provenance = ?'); params.append(provenance)
        if status: clauses.append('status = ?'); params.append(status)
        return [dict(row) for row in self.connection.execute(f"SELECT * FROM evidence WHERE {' AND '.join(clauses)} ORDER BY created_at DESC", params).fetchall()]
    def create_candidate(self, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        now, item_id = utc_now(), str(uuid4()); self.connection.execute('INSERT INTO release_candidates(id, project_id, title, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', (item_id, project_id, values['title'], values['summary'], now, now)); self.connection.commit(); return row_dict(self.connection.execute('SELECT * FROM release_candidates WHERE id = ?', (item_id,)).fetchone()) or {}
    def get_candidate(self, project_id: str, candidate_id: str) -> dict[str, Any] | None: return row_dict(self.connection.execute('SELECT * FROM release_candidates WHERE project_id = ? AND id = ?', (project_id, candidate_id)).fetchone())
    def update_candidate(self, project_id: str, candidate_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
        assignments = ', '.join(f'{key} = ?' for key in values); self.connection.execute(f'UPDATE release_candidates SET {assignments}, revision = revision + 1, updated_at = ? WHERE project_id = ? AND id = ?', [*values.values(), utc_now(), project_id, candidate_id]); self.connection.commit(); return self.get_candidate(project_id, candidate_id)
    def list_candidates(self, project_id: str) -> list[dict[str, Any]]: return [dict(row) for row in self.connection.execute('SELECT * FROM release_candidates WHERE project_id = ? ORDER BY updated_at DESC', (project_id,)).fetchall()]
    def save_candidate_revision(self, values: dict[str, Any]) -> dict[str, Any]:
        item_id = str(uuid4()); self.connection.execute('INSERT INTO release_candidate_revisions(id, candidate_id, revision, status, snapshot_json, fingerprint, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', (item_id, values['candidate_id'], values['revision'], values['status'], values['snapshot_json'], values['fingerprint'], utc_now())); self.connection.commit(); return row_dict(self.connection.execute('SELECT * FROM release_candidate_revisions WHERE id = ?', (item_id,)).fetchone()) or {}
    def list_candidate_revisions(self, candidate_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute('SELECT * FROM release_candidate_revisions WHERE candidate_id = ? ORDER BY revision', (candidate_id,)).fetchall()]
    def save_gate(self, values: dict[str, Any]) -> dict[str, Any]:
        item_id = str(uuid4()); self.connection.execute('INSERT INTO gate_evaluations(id, candidate_id, candidate_revision, outcome, input_fingerprint, blockers, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', (item_id, values['candidate_id'], values['candidate_revision'], values['outcome'], values['input_fingerprint'], json.dumps(values['blockers'], sort_keys=True), utc_now())); self.connection.commit(); return {**values, 'id': item_id}
    def list_gates(self, candidate_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute('SELECT * FROM gate_evaluations WHERE candidate_id = ? ORDER BY created_at DESC', (candidate_id,)).fetchall()]

    def save_verification(self, values: dict[str, Any]) -> dict[str, Any]:
        item_id = str(uuid4())
        self.connection.execute('INSERT INTO verification_evaluations(id, project_id, rule_id, candidate_id, outcome, input_fingerprint, blockers, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', (item_id, values['project_id'], values['rule_id'], values.get('candidate_id'), values['outcome'], values['input_fingerprint'], json.dumps(values['blockers'], sort_keys=True), utc_now()))
        self.connection.commit()
        return row_dict(self.connection.execute('SELECT * FROM verification_evaluations WHERE id = ?', (item_id,)).fetchone()) or {}

    def list_verifications(self, project_id: str) -> list[dict[str, Any]]:
        return [dict(row) for row in self.connection.execute('SELECT * FROM verification_evaluations WHERE project_id = ? ORDER BY created_at DESC', (project_id,)).fetchall()]

    def get_verification(self, project_id: str, evaluation_id: str) -> dict[str, Any] | None:
        return row_dict(self.connection.execute('SELECT * FROM verification_evaluations WHERE project_id = ? AND id = ?', (project_id, evaluation_id)).fetchone())

    def save_manifest(self, values: dict[str, Any]) -> dict[str, Any]:
        existing = self.connection.execute('SELECT * FROM release_manifests WHERE candidate_id = ? AND gate_evaluation_id = ?', (values['candidate_id'], values['gate_evaluation_id'])).fetchone()
        if existing is not None: return dict(existing)
        item_id = str(uuid4())
        self.connection.execute('INSERT INTO release_manifests(id, candidate_id, gate_evaluation_id, schema_version, fingerprint, status, payload_json, markdown, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', (item_id, values['candidate_id'], values['gate_evaluation_id'], values['schema_version'], values['fingerprint'], values['status'], values['payload_json'], values['markdown'], utc_now()))
        self.connection.commit()
        return row_dict(self.connection.execute('SELECT * FROM release_manifests WHERE id = ?', (item_id,)).fetchone()) or {}

    def get_manifest(self, candidate_id: str, manifest_id: str | None = None) -> dict[str, Any] | None:
        if manifest_id:
            return row_dict(self.connection.execute('SELECT m.* FROM release_manifests m JOIN release_candidates c ON c.id = m.candidate_id WHERE m.candidate_id = ? AND m.id = ?', (candidate_id, manifest_id)).fetchone())
        return row_dict(self.connection.execute('SELECT * FROM release_manifests WHERE candidate_id = ? ORDER BY created_at DESC, id DESC LIMIT 1', (candidate_id,)).fetchone())
