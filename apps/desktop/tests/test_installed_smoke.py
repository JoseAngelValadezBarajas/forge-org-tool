from __future__ import annotations

import os
import sqlite3
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[2] / 'api' / 'src'))
sys.path.insert(0, str(Path(__file__).parents[1]))

from forge_org.infrastructure.connection import connect  # noqa: E402
from sidecar_launcher import app_data_root, backup_database, local_paths  # noqa: E402


class InstalledSmokeTests(unittest.TestCase):
    def test_fresh_install_and_restart_preserve_only_synthetic_local_data(self) -> None:
        with TemporaryDirectory() as temporary_root:
            with patch.dict(os.environ, {'LOCALAPPDATA': temporary_root}, clear=False):
                database_path, _ = local_paths()
                with patch.dict(os.environ, {'FORGE_DATABASE_PATH': str(database_path)}, clear=False):
                    first = connect()
                    first.execute(
                        "INSERT INTO workspaces(id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
                        ('synthetic-workspace', 'Synthetic', '2026-01-01', '2026-01-01'),
                    )
                    first.commit()
                    first.close()

                    second = connect()
                    self.assertEqual(
                        second.execute(
                            "SELECT name FROM workspaces WHERE id = ?",
                            ('synthetic-workspace',),
                        ).fetchone()[0],
                        'Synthetic',
                    )
                    second.close()

                self.assertTrue(database_path.is_relative_to(app_data_root()))
                self.assertFalse((Path(temporary_root) / 'forge.db').exists())

    def test_restart_creates_recoverable_database_backup(self) -> None:
        with TemporaryDirectory() as temporary_root:
            with patch.dict(os.environ, {'LOCALAPPDATA': temporary_root}, clear=False):
                database_path, _ = local_paths()
                database_path.parent.mkdir(parents=True, exist_ok=True)
                database_path.write_bytes(b'synthetic database')
                backup = backup_database(database_path)

                self.assertIsNotNone(backup)
                self.assertEqual(backup.read_bytes(), b'synthetic database')
                self.assertTrue(backup.is_relative_to(app_data_root() / 'backups'))

    def test_upgrade_smoke_preserves_a_previous_synthetic_schema(self) -> None:
        with TemporaryDirectory() as temporary_root:
            database = Path(temporary_root) / 'upgrade.db'
            legacy = sqlite3.connect(database)
            legacy.executescript(
                """
                CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
                INSERT INTO schema_version VALUES (1);
                CREATE TABLE workspaces (
                    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
                    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
                );
                INSERT INTO workspaces VALUES
                    ('legacy', 'Legacy synthetic', NULL, '2026-01-01', '2026-01-01');
                """
            )
            legacy.commit()
            legacy.close()
            with patch.dict(os.environ, {'FORGE_DATABASE_PATH': str(database)}, clear=False):
                upgraded = connect()
                try:
                    self.assertEqual(
                        upgraded.execute("SELECT name FROM workspaces WHERE id = 'legacy'").fetchone()[0],
                        'Legacy synthetic',
                    )
                    self.assertEqual(
                        upgraded.execute("SELECT max(version) FROM schema_migrations").fetchone()[0],
                        4,
                    )
                finally:
                    upgraded.close()


if __name__ == '__main__':
    unittest.main()
