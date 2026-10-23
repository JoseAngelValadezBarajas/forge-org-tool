"""Build a disposable pre-MVP SQLite database for browser acceptance tests."""

import sqlite3
import sys
from pathlib import Path


def main(database_path: str) -> None:
    path = Path(database_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as connection:
        connection.executescript(
            """
            CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
            INSERT INTO schema_version VALUES (2);
            CREATE TABLE workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
            INSERT INTO workspaces VALUES ('legacy-workspace', 'Synthetic upgraded fixture', NULL, 'old', 'old');
            CREATE TABLE projects (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL,
                name TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT);
            INSERT INTO projects VALUES ('legacy-project', 'legacy-workspace', 'Legacy Board', NULL,
                'active', 'old', 'old', NULL);
            CREATE TABLE epics (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL,
                description TEXT, status TEXT NOT NULL DEFAULT 'planning',
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
            INSERT INTO epics VALUES ('legacy-backlog', 'legacy-project', 'Legacy planning Epic', NULL,
                'planning', 'old', 'old');
            INSERT INTO epics VALUES ('legacy-ready', 'legacy-project', 'Legacy planned Epic', NULL,
                'planned', 'old', 'old');
            INSERT INTO epics VALUES ('legacy-archived', 'legacy-project', 'Archived Epic', NULL,
                'archived', 'old', 'archived-on');
            INSERT INTO epics VALUES ('legacy-unknown', 'legacy-project', 'Custom state Epic', NULL,
                'custom_legacy', 'old', 'old');
            CREATE TABLE features (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, epic_id TEXT,
                title TEXT NOT NULL, description TEXT, goal TEXT, priority TEXT NOT NULL DEFAULT 'medium',
                status TEXT NOT NULL DEFAULT 'backlog', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
            """
        )


if __name__ == '__main__':
    main(sys.argv[1])
