from __future__ import annotations

import sqlite3

VERSION = 2


def upgrade(connection: sqlite3.Connection) -> None:
    """Add the migration ledger metadata used by the compatibility layer."""
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS database_metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        INSERT INTO database_metadata(key, value)
        VALUES ('migration_state', 'current')
        ON CONFLICT(key) DO UPDATE SET value = excluded.value;
        """
    )
