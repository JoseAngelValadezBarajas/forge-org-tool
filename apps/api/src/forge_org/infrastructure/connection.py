"""SQLite connection lifecycle, kept separate from domain persistence methods."""

import os
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from threading import RLock
from typing import cast

from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool

_MIGRATION_LOCK = RLock()


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def database_path() -> Path:
    configured = os.environ.get('FORGE_DATABASE_PATH')
    return Path(configured) if configured else Path.cwd() / '.forge' / 'forge.db'


def _schema_is_current(path: Path, current_version: int) -> bool:
    if not path.is_file() or path.stat().st_size == 0:
        return False
    with sqlite3.connect(path) as probe:
        tables = {
            row[0]
            for row in probe.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }
        if not {'schema_version', 'schema_migrations'} <= tables:
            return False
        schema_version = probe.execute('SELECT max(version) FROM schema_version').fetchone()[0]
        migration_version = probe.execute('SELECT max(version) FROM schema_migrations').fetchone()[
            0
        ]
        return schema_version == current_version and migration_version == current_version


def connect() -> sqlite3.Connection:
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    # Serialize backup + migration because API requests can open connections concurrently.
    with _MIGRATION_LOCK:
        # Import lazily so migration tooling and backup verification stay acyclic.
        from .migrations.backup import backup_before_migration
        from .migrations.runner import CURRENT_SCHEMA_VERSION, migrate

        needs_migration = not _schema_is_current(path, CURRENT_SCHEMA_VERSION)
        if needs_migration:
            backup_before_migration(path, current_version=CURRENT_SCHEMA_VERSION)
        engine = create_engine(
            f'sqlite:///{path.as_posix()}',
            connect_args={'check_same_thread': False},
            poolclass=NullPool,
        )
        raw_connection = engine.raw_connection()
        cast(sqlite3.Connection, raw_connection.driver_connection).row_factory = sqlite3.Row
        connection = cast(sqlite3.Connection, raw_connection)
        connection.execute('PRAGMA foreign_keys = ON')
        if needs_migration:
            migrate(connection)
    return connection
