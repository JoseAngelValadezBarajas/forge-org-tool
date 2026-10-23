"""Add normalized planning tags, work-item kinds, and structured Bug fields."""

import sqlite3

VERSION = 3


def _add_column(connection: sqlite3.Connection, table: str, declaration: str) -> None:
    column = declaration.split()[0]
    columns = {row[1] for row in connection.execute(f'PRAGMA table_info({table})')}
    if column not in columns:
        connection.execute(f'ALTER TABLE {table} ADD COLUMN {declaration}')


def upgrade(connection: sqlite3.Connection) -> None:
    """Apply core 1.0 planning metadata; safe to retry after an interrupted run."""
    _add_column(
        connection,
        'epics',
        "priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical'))",
    )
    _add_column(connection, 'epics', 'archived_at TEXT')
    _add_column(connection, 'features', "kind TEXT NOT NULL DEFAULT 'feature'")
    _add_column(connection, 'features', 'bug_severity TEXT')
    _add_column(connection, 'features', 'steps_to_reproduce TEXT')
    _add_column(connection, 'features', 'expected_result TEXT')
    _add_column(connection, 'features', 'actual_result TEXT')
    _add_column(connection, 'features', 'notes TEXT')
    connection.execute(
        "UPDATE epics SET archived_at = updated_at, status = 'backlog' WHERE status = 'archived' AND archived_at IS NULL"
    )
    connection.execute("UPDATE epics SET status = 'backlog' WHERE status = 'planning'")
    connection.execute("UPDATE epics SET status = 'ready' WHERE status = 'planned'")
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            normalized_name TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#6b7280',
            created_at TEXT NOT NULL,
            UNIQUE(workspace_id, normalized_name)
        );
        CREATE TABLE IF NOT EXISTS epic_tags (
            epic_id TEXT NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
            tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY(epic_id, tag_id)
        );
        CREATE TABLE IF NOT EXISTS feature_tags (
            feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY(feature_id, tag_id)
        );
        CREATE TABLE IF NOT EXISTS bug_attachments (
            id TEXT PRIMARY KEY,
            feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            relative_path TEXT NOT NULL,
            file_name TEXT NOT NULL,
            content_type TEXT NOT NULL,
            byte_size INTEGER NOT NULL,
            sha256 TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(feature_id, sha256)
        );
        """
    )
    _add_column(connection, 'tags', "color TEXT NOT NULL DEFAULT '#6b7280'")
