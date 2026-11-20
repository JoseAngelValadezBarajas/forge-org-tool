"""Add an optional due date to work items so personal planning can be driven by deadlines."""

import sqlite3

VERSION = 6


def upgrade(connection: sqlite3.Connection) -> None:
    """Add `features.due_date` (ISO date text), idempotently and without touching existing rows."""
    columns = {row[1] for row in connection.execute('PRAGMA table_info(features)')}
    if 'due_date' not in columns:
        connection.execute('ALTER TABLE features ADD COLUMN due_date TEXT')
    connection.execute(
        'CREATE INDEX IF NOT EXISTS features_due_date_idx ON features(project_id, due_date)'
    )
