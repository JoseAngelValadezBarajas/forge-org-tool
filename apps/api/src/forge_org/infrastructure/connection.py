"""SQLite connection lifecycle, kept separate from domain persistence methods."""

import os
import sqlite3
from contextlib import closing
from pathlib import Path
from threading import RLock

from forge_org.domain.clock import utc_now

__all__ = ['utc_now']

_MIGRATION_LOCK = RLock()

# How long a writer waits for another connection's lock before failing with "database is locked".
# Requests run on a thread pool and each opens its own connection, so writers do overlap.
BUSY_TIMEOUT_SECONDS = 15.0


def database_path() -> Path:
    configured = os.environ.get('FORGE_DATABASE_PATH')
    return Path(configured) if configured else Path.cwd() / '.forge' / 'forge.db'


def _schema_is_current(path: Path, current_version: int) -> bool:
    if not path.is_file() or path.stat().st_size == 0:
        return False
    with closing(sqlite3.connect(path)) as probe:
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
        return bool(schema_version == current_version and migration_version == current_version)


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
        connection = sqlite3.connect(path, check_same_thread=False, timeout=BUSY_TIMEOUT_SECONDS)
        connection.row_factory = sqlite3.Row
        connection.execute('PRAGMA foreign_keys = ON')
        if needs_migration:
            migrate(connection)
    return connection
