from __future__ import annotations

import sqlite3

import pytest

from forge_org.infrastructure.sqlite import connect


def test_fresh_database_records_explicit_migration_versions(tmp_path, monkeypatch):
    monkeypatch.setenv("FORGE_DATABASE_PATH", str(tmp_path / "fresh.db"))

    connection = connect()

    versions = [
        row[0]
        for row in connection.execute(
            "SELECT version FROM schema_migrations ORDER BY version"
        ).fetchall()
    ]
    assert versions == [1, 2]
    assert connection.execute("PRAGMA user_version").fetchone()[0] == 2
    assert connection.execute(
        "SELECT value FROM database_metadata WHERE key = 'migration_state'"
    ).fetchone()[0] == "current"
    connection.close()


def test_previous_synthetic_schema_is_upgraded_without_losing_records(tmp_path, monkeypatch):
    database = tmp_path / "upgrade.db"
    legacy = sqlite3.connect(database)
    legacy.executescript(
        """
        CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
        INSERT INTO schema_version(version) VALUES (1);
        CREATE TABLE workspaces (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        INSERT INTO workspaces VALUES
            ('workspace-1', 'Synthetic workspace', NULL, '2026-01-01', '2026-01-01');
        """
    )
    legacy.commit()
    legacy.close()
    monkeypatch.setenv("FORGE_DATABASE_PATH", str(database))

    connection = connect()

    assert connection.execute(
        "SELECT name FROM workspaces WHERE id = 'workspace-1'"
    ).fetchone()[0] == "Synthetic workspace"
    assert connection.execute(
        "SELECT max(version) FROM schema_migrations"
    ).fetchone()[0] == 2
    connection.close()


def test_unknown_future_schema_is_rejected_without_mutation(tmp_path, monkeypatch):
    database = tmp_path / "future.db"
    legacy = sqlite3.connect(database)
    legacy.executescript(
        """
        CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
        INSERT INTO schema_version(version) VALUES (99);
        """
    )
    legacy.commit()
    legacy.close()
    monkeypatch.setenv("FORGE_DATABASE_PATH", str(database))

    with pytest.raises(RuntimeError, match="unsupported database schema version"):
        connect()

    check = sqlite3.connect(database)
    assert check.execute("SELECT version FROM schema_version").fetchone()[0] == 99
    assert check.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'"
    ).fetchone() is None
    check.close()
