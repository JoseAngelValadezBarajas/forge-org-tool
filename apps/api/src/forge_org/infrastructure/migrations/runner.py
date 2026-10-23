"""Versioned migration runner for the local SQLite database."""

import sqlite3

from ..connection import utc_now
from .legacy_schema import _apply_legacy_schema
from .v0002_metadata import VERSION as METADATA_MIGRATION_VERSION
from .v0002_metadata import upgrade as upgrade_metadata
from .v0003_core_work_items import VERSION as CORE_WORK_ITEMS_MIGRATION_VERSION
from .v0003_core_work_items import upgrade as upgrade_core_work_items
from .v0004_workspace_archive import VERSION as WORKSPACE_ARCHIVE_MIGRATION_VERSION
from .v0004_workspace_archive import upgrade as upgrade_workspace_archive

CURRENT_SCHEMA_VERSION = WORKSPACE_ARCHIVE_MIGRATION_VERSION


def migrate(connection: sqlite3.Connection) -> None:
    """Apply compatibility-preserving, versioned local schema migrations."""
    has_existing_schema = bool(
        connection.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' LIMIT 1"
        ).fetchone()
    )
    existing_version = (
        connection.execute('SELECT max(version) FROM schema_version').fetchone()[0]
        if connection.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_version'"
        ).fetchone()
        else 0
    )
    if existing_version > CURRENT_SCHEMA_VERSION:
        raise RuntimeError(f'unsupported database schema version: {existing_version}')

    _apply_legacy_schema(connection, include_legacy=has_existing_schema)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        )
        """
    )
    connection.execute(
        'INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)',
        (1, utc_now()),
    )

    applied = {
        row[0] for row in connection.execute('SELECT version FROM schema_migrations').fetchall()
    }
    if METADATA_MIGRATION_VERSION not in applied:
        upgrade_metadata(connection)
        connection.execute(
            'INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)',
            (2, utc_now()),
        )
    if CORE_WORK_ITEMS_MIGRATION_VERSION not in applied:
        upgrade_core_work_items(connection)
        connection.execute(
            'INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)',
            (CORE_WORK_ITEMS_MIGRATION_VERSION, utc_now()),
        )
    if WORKSPACE_ARCHIVE_MIGRATION_VERSION not in applied:
        upgrade_workspace_archive(connection)
        connection.execute(
            'INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)',
            (WORKSPACE_ARCHIVE_MIGRATION_VERSION, utc_now()),
        )
    connection.execute(
        'INSERT OR IGNORE INTO schema_version(version) VALUES (?)',
        (CURRENT_SCHEMA_VERSION,),
    )
    connection.execute(f'PRAGMA user_version = {CURRENT_SCHEMA_VERSION}')
    connection.commit()
