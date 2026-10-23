"""Add reversible workspace archive metadata without changing child records."""

import sqlite3

VERSION = 4


def upgrade(connection: sqlite3.Connection) -> None:
    columns = {row[1] for row in connection.execute('PRAGMA table_info(workspaces)')}
    if 'archived_at' not in columns:
        connection.execute('ALTER TABLE workspaces ADD COLUMN archived_at TEXT')
