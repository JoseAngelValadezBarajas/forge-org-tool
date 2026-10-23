from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from forge_org.infrastructure.connection import connect


def test_fresh_database_records_explicit_migration_versions(tmp_path, monkeypatch):
    monkeypatch.setenv('FORGE_DATABASE_PATH', str(tmp_path / 'fresh.db'))

    connection = connect()

    versions = [
        row[0]
        for row in connection.execute(
            'SELECT version FROM schema_migrations ORDER BY version'
        ).fetchall()
    ]
    assert versions == [1, 2, 3, 4]
    assert connection.execute('PRAGMA user_version').fetchone()[0] == 4
    assert 'archived_at' in {
        row[1] for row in connection.execute('PRAGMA table_info(workspaces)').fetchall()
    }
    assert (
        connection.execute(
            "SELECT value FROM database_metadata WHERE key = 'migration_state'"
        ).fetchone()[0]
        == 'current'
    )
    tables = {
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    }
    assert {'workspaces', 'projects', 'epics', 'features', 'tasks', 'acceptance_criteria'} <= tables
    assert {'tags', 'epic_tags', 'feature_tags', 'bug_attachments'} <= tables
    epic_columns = {row[1] for row in connection.execute('PRAGMA table_info(epics)').fetchall()}
    feature_columns = {
        row[1] for row in connection.execute('PRAGMA table_info(features)').fetchall()
    }
    assert 'priority' in epic_columns
    assert {
        'kind',
        'bug_severity',
        'steps_to_reproduce',
        'expected_result',
        'actual_result',
        'notes',
    } <= feature_columns
    assert (
        not {
            'decisions',
            'invariants',
            'readiness_evaluations',
            'repositories',
            'context_packages',
            'runs',
            'handoffs',
            'evidence',
            'release_candidates',
        }
        & tables
    )
    connection.close()


def test_upgrade_preserves_existing_rows_from_retired_tables(tmp_path, monkeypatch):
    database = tmp_path / 'legacy.db'
    legacy = sqlite3.connect(database)
    legacy.executescript(
        """
        CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
        INSERT INTO schema_version(version) VALUES (2);
        CREATE TABLE decisions (id TEXT PRIMARY KEY, title TEXT NOT NULL);
        INSERT INTO decisions VALUES ('decision-1', 'Keep historical decision');
        """
    )
    legacy.commit()
    legacy.close()
    monkeypatch.setenv('FORGE_DATABASE_PATH', str(database))

    connection = connect()

    assert (
        connection.execute("SELECT title FROM decisions WHERE id = 'decision-1'").fetchone()[0]
        == 'Keep historical decision'
    )
    connection.close()


def test_legacy_epic_statuses_migrate_to_workflow_and_separate_archive(tmp_path, monkeypatch):
    database = tmp_path / 'epic-status-legacy.db'
    legacy = sqlite3.connect(database)
    legacy.executescript(
        """
        CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
        INSERT INTO schema_version VALUES (2);
        CREATE TABLE workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        INSERT INTO workspaces VALUES ('w1', 'Workspace', NULL, 'now', 'now');
        CREATE TABLE projects (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL,
            name TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT);
        INSERT INTO projects VALUES ('p1', 'w1', 'Project', NULL, 'active', 'now', 'now', NULL);
        CREATE TABLE epics (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL,
            description TEXT, status TEXT NOT NULL DEFAULT 'planning',
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        INSERT INTO epics VALUES ('planning', 'p1', 'Planning', NULL, 'planning', 'now', 'now');
        INSERT INTO epics VALUES ('planned', 'p1', 'Planned', NULL, 'planned', 'now', 'now');
        INSERT INTO epics VALUES ('active', 'p1', 'Active', NULL, 'in_progress', 'now', 'now');
        INSERT INTO epics VALUES ('archived', 'p1', 'Archived', NULL, 'archived', 'now', 'now');
        """
    )
    legacy.commit()
    legacy.close()
    monkeypatch.setenv('FORGE_DATABASE_PATH', str(database))

    connection = connect()

    statuses = {
        row['id']: (row['status'], row['archived_at'])
        for row in connection.execute('SELECT id, status, archived_at FROM epics').fetchall()
    }
    assert statuses['planning'] == ('backlog', None)
    assert statuses['planned'] == ('ready', None)
    assert statuses['active'] == ('in_progress', None)
    assert statuses['archived'] == ('backlog', 'now')
    connection.close()


def test_previous_synthetic_schema_is_upgraded_without_losing_records(tmp_path, monkeypatch):
    database = tmp_path / 'upgrade.db'
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
    monkeypatch.setenv('FORGE_DATABASE_PATH', str(database))

    connection = connect()

    assert (
        connection.execute("SELECT name FROM workspaces WHERE id = 'workspace-1'").fetchone()[0]
        == 'Synthetic workspace'
    )
    assert connection.execute('SELECT max(version) FROM schema_migrations').fetchone()[0] == 4
    assert (
        connection.execute(
            "SELECT archived_at FROM workspaces WHERE id = 'workspace-1'"
        ).fetchone()[0]
        is None
    )
    connection.close()
    backups = list(tmp_path.glob('upgrade.db.pre-migration-*.bak'))
    assert len(backups) == 1
    backup = sqlite3.connect(backups[0])
    assert backup.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    assert (
        backup.execute("SELECT name FROM workspaces WHERE id = 'workspace-1'").fetchone()[0]
        == 'Synthetic workspace'
    )
    backup.close()
    connection.close()
    replayed = connect()
    assert replayed.execute('SELECT max(version) FROM schema_version').fetchone()[0] == 4
    assert len(list(tmp_path.glob('upgrade.db.pre-migration-*.bak'))) == 1
    replayed.close()


def test_interrupted_backup_is_cleaned_and_migration_can_retry(tmp_path, monkeypatch):
    database = tmp_path / 'retry.db'
    legacy = sqlite3.connect(database)
    legacy.executescript(
        """
        CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
        INSERT INTO schema_version(version) VALUES (1);
        CREATE TABLE workspaces (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        INSERT INTO workspaces VALUES ('w1', 'Retry', NULL, 'now', 'now');
        """
    )
    legacy.commit()
    legacy.close()
    monkeypatch.setenv('FORGE_DATABASE_PATH', str(database))
    original_replace = Path.replace

    def interrupted_replace(path: Path, target: Path) -> Path:
        if str(target).endswith('.bak'):
            raise OSError('synthetic interruption before backup publication')
        return original_replace(path, target)

    monkeypatch.setattr(Path, 'replace', interrupted_replace)
    with pytest.raises(OSError, match='synthetic interruption'):
        connect()
    assert not list(tmp_path.glob('retry.db.pre-migration-*.bak'))
    assert not list(tmp_path.glob('retry.db.pre-migration-*.tmp'))
    check = sqlite3.connect(database)
    assert check.execute('SELECT max(version) FROM schema_version').fetchone()[0] == 1
    check.close()

    monkeypatch.setattr(Path, 'replace', original_replace)
    connection = connect()
    assert connection.execute('SELECT max(version) FROM schema_version').fetchone()[0] == 4
    connection.close()
    assert len(list(tmp_path.glob('retry.db.pre-migration-*.bak'))) == 1


def test_unknown_future_schema_is_rejected_without_mutation(tmp_path, monkeypatch):
    database = tmp_path / 'future.db'
    legacy = sqlite3.connect(database)
    legacy.executescript(
        """
        CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
        INSERT INTO schema_version(version) VALUES (99);
        """
    )
    legacy.commit()
    legacy.close()
    monkeypatch.setenv('FORGE_DATABASE_PATH', str(database))

    with pytest.raises(RuntimeError, match='unsupported database schema version'):
        connect()

    check = sqlite3.connect(database)
    assert check.execute('SELECT version FROM schema_version').fetchone()[0] == 99
    assert (
        check.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'"
        ).fetchone()
        is None
    )
    check.close()
