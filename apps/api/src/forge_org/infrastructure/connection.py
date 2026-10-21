"""SQLite connection lifecycle, kept separate from domain persistence methods."""

import os
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import cast

from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def database_path() -> Path:
    configured = os.environ.get('FORGE_DATABASE_PATH')
    return Path(configured) if configured else Path.cwd() / '.forge' / 'forge.db'


def connect() -> sqlite3.Connection:
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        f'sqlite:///{path.as_posix()}',
        connect_args={'check_same_thread': False},
        poolclass=NullPool,
    )
    raw_connection = engine.raw_connection()
    cast(sqlite3.Connection, raw_connection.driver_connection).row_factory = sqlite3.Row
    connection = cast(sqlite3.Connection, raw_connection)
    connection.execute('PRAGMA foreign_keys = ON')
    # Import lazily to avoid a cycle: migrations live with the persistence store.
    from .sqlite import migrate

    migrate(connection)
    return connection
