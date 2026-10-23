from __future__ import annotations

import sqlite3
from concurrent.futures import ThreadPoolExecutor
from importlib import import_module
from pathlib import Path
from threading import Barrier, Lock
from time import sleep

import pytest

from forge_org.infrastructure.connection import connect
from forge_org.infrastructure.migrations.legacy_schema import _apply_legacy_schema
from forge_org.infrastructure.migrations.v0002_metadata import upgrade as upgrade_metadata
from forge_org.infrastructure.migrations.v0003_core_work_items import (
    upgrade as upgrade_core_work_items,
)
from forge_org.infrastructure.migrations.v0004_workspace_archive import (
    upgrade as upgrade_workspace_archive,
)


def test_concurrent_first_connections_serialize_database_migrations(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from forge_org.infrastructure.migrations import runner

    monkeypatch.setenv('FORGE_DATABASE_PATH', str(tmp_path / 'concurrent-first-open.db'))
    original_migrate = runner.migrate
    barrier = Barrier(8)
    counter_lock = Lock()
    active_migrations = 0
    maximum_active_migrations = 0

    def observed_migrate(connection: sqlite3.Connection) -> None:
        nonlocal active_migrations, maximum_active_migrations
        with counter_lock:
            active_migrations += 1
            maximum_active_migrations = max(maximum_active_migrations, active_migrations)
        sleep(0.05)
        try:
            original_migrate(connection)
        finally:
            with counter_lock:
                active_migrations -= 1

    monkeypatch.setattr(runner, 'migrate', observed_migrate)

    def open_database() -> int:
        barrier.wait(timeout=10)
        connection = connect()
        try:
            return connection.execute('PRAGMA user_version').fetchone()[0]
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=8) as pool:
        versions = list(pool.map(lambda _: open_database(), range(8)))

    assert versions == [5] * 8
    assert maximum_active_migrations == 1


def test_current_database_does_not_rerun_schema_migrations_on_each_connection(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from forge_org.infrastructure.migrations import runner

    monkeypatch.setenv('FORGE_DATABASE_PATH', str(tmp_path / 'current-schema.db'))
    first = connect()
    first.close()
    original_migrate = runner.migrate

    def unexpected_migration(connection: sqlite3.Connection) -> None:
        raise AssertionError('A current database should not be migrated on every API request')

    monkeypatch.setattr(runner, 'migrate', unexpected_migration)
    second = connect()
    assert second.execute('PRAGMA user_version').fetchone()[0] == 5
    second.close()
    monkeypatch.setattr(runner, 'migrate', original_migrate)


def test_epic_status_migration_is_repeatable_and_preserves_rows_and_archives(
    tmp_path: Path,
):
    database = tmp_path / 'epic-status-v5.db'
    connection = sqlite3.connect(database)
    connection.execute(
        'CREATE TABLE epics (id TEXT PRIMARY KEY, status TEXT NOT NULL, archived_at TEXT)'
    )
    connection.executemany(
        'INSERT INTO epics VALUES (?, ?, ?)',
        [
            ('planning', 'planning', None),
            ('planned', 'planned', None),
            ('valid', 'in_progress', None),
            ('archived', 'backlog', '2026-10-01T00:00:00+00:00'),
            ('unknown', 'custom_legacy', None),
            ('duplicate-500-a', 'planning', None),
            ('duplicate-500-b', 'planning', None),
        ],
    )
    connection.commit()

    migration = import_module('forge_org.infrastructure.migrations.v0005_epic_status_normalization')
    assert migration.VERSION == 5
    migration.upgrade(connection)
    migration.upgrade(connection)

    rows = dict(connection.execute('SELECT id, status FROM epics').fetchall())
    assert rows == {
        'planning': 'backlog',
        'planned': 'ready',
        'valid': 'in_progress',
        'archived': 'backlog',
        'unknown': 'custom_legacy',
        'duplicate-500-a': 'backlog',
        'duplicate-500-b': 'backlog',
    }
    assert (
        connection.execute('SELECT archived_at FROM epics WHERE id = ?', ('archived',)).fetchone()[
            0
        ]
        == '2026-10-01T00:00:00+00:00'
    )
    assert connection.execute('SELECT count(*) FROM epics').fetchone()[0] == 7
    connection.close()


def test_v5_normalizes_post_v3_default_rows_with_backup_and_without_deduplicating(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    database = tmp_path / 'post-v3-legacy-default.db'
    monkeypatch.setenv('FORGE_DATABASE_PATH', str(database))
    old = sqlite3.connect(database)
    old.executescript(
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
        CREATE TABLE features (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, epic_id TEXT,
            title TEXT NOT NULL, description TEXT, goal TEXT, priority TEXT NOT NULL DEFAULT 'medium',
            status TEXT NOT NULL DEFAULT 'backlog', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        """
    )
    _apply_legacy_schema(old, include_legacy=False)
    upgrade_metadata(old)
    upgrade_core_work_items(old)
    upgrade_workspace_archive(old)
    old.execute(
        'CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)'
    )
    old.executemany(
        'INSERT INTO schema_migrations VALUES (?, ?)',
        [(version, 'already applied') for version in range(1, 5)],
    )
    old.execute('INSERT INTO schema_version VALUES (4)')
    old.executemany(
        'INSERT INTO epics(id, project_id, title, description, priority, created_at, updated_at) '
        'VALUES (?, ?, ?, NULL, ?, ?, ?)',
        [
            ('failed-create-a', 'p1', 'Installed Bug smoke duplicate', 'medium', 'now', 'now'),
            ('failed-create-b', 'p1', 'Installed Bug smoke duplicate', 'medium', 'now', 'now'),
        ],
    )
    old.execute(
        'INSERT INTO epics(id, project_id, title, description, status, priority, created_at, updated_at, archived_at) '
        "VALUES ('archived', 'p1', 'Archived', NULL, 'done', 'high', 'now', 'now', 'archive-date')"
    )
    old.commit()
    old.close()

    upgraded = connect()
    rows = upgraded.execute(
        'SELECT id, title, status, archived_at FROM epics ORDER BY id'
    ).fetchall()
    assert [(row['id'], row['status']) for row in rows] == [
        ('archived', 'done'),
        ('failed-create-a', 'backlog'),
        ('failed-create-b', 'backlog'),
    ]
    assert next(row['archived_at'] for row in rows if row['id'] == 'archived') == 'archive-date'
    assert upgraded.execute('SELECT max(version) FROM schema_migrations').fetchone()[0] == 5
    upgraded.close()

    backups = list(tmp_path.glob('post-v3-legacy-default.db.pre-migration-*.bak'))
    assert len(backups) == 1
    with sqlite3.connect(backups[0]) as backup:
        assert backup.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        assert (
            backup.execute("SELECT count(*) FROM epics WHERE status = 'planning'").fetchone()[0]
            == 2
        )
        assert backup.execute('SELECT count(*) FROM epics').fetchone()[0] == 3

    replayed = connect()
    assert replayed.execute('SELECT count(*) FROM epics').fetchone()[0] == 3
    assert len(list(tmp_path.glob('post-v3-legacy-default.db.pre-migration-*.bak'))) == 1
    replayed.close()


def test_fresh_database_records_explicit_migration_versions(tmp_path, monkeypatch):
    monkeypatch.setenv('FORGE_DATABASE_PATH', str(tmp_path / 'fresh.db'))

    connection = connect()

    versions = [
        row[0]
        for row in connection.execute(
            'SELECT version FROM schema_migrations ORDER BY version'
        ).fetchall()
    ]
    assert versions == [1, 2, 3, 4, 5]
    assert connection.execute('PRAGMA user_version').fetchone()[0] == 5
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
    assert connection.execute('SELECT max(version) FROM schema_migrations').fetchone()[0] == 5
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
    assert replayed.execute('SELECT max(version) FROM schema_version').fetchone()[0] == 5
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
    assert connection.execute('SELECT max(version) FROM schema_version').fetchone()[0] == 5
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
