"""Normalize legacy Epic workflow values without replacing or discarding records."""

import sqlite3

VERSION = 5


def upgrade(connection: sqlite3.Connection) -> None:
    """Move retired planning statuses into supported MVP columns, idempotently."""
    connection.execute("UPDATE epics SET status = 'backlog' WHERE status = 'planning'")
    connection.execute("UPDATE epics SET status = 'ready' WHERE status = 'planned'")
