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
