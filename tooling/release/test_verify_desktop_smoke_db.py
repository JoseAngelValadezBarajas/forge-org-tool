import importlib.util
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path


SCRIPT = Path(__file__).with_name("verify-desktop-smoke-db.py")
SPEC = importlib.util.spec_from_file_location("verify_desktop_smoke_db", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class VerifyDesktopSmokeDatabaseTests(unittest.TestCase):
    def test_finds_exact_workspace_and_project_records_read_only(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            database = Path(temp_dir) / "forge.db"
            with closing(sqlite3.connect(database)) as connection:
                connection.executescript(
                    """
                    CREATE TABLE workspaces (name TEXT NOT NULL);
                    CREATE TABLE projects (name TEXT NOT NULL);
                    INSERT INTO workspaces VALUES ('Synthetic workspace');
                    INSERT INTO projects VALUES ('Synthetic project');
                    """
                )

            self.assertEqual(
                MODULE.record_count(database, "workspaces", "Synthetic workspace"), 1
            )
            self.assertEqual(
                MODULE.record_count(database, "projects", "Synthetic project"), 1
            )
            self.assertEqual(MODULE.record_count(database, "workspaces", "missing"), 0)

    def test_rejects_unknown_table_and_missing_database_without_creating_it(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            missing_database = Path(temp_dir) / "missing.db"
            with self.assertRaises(FileNotFoundError):
                MODULE.record_count(missing_database, "workspaces", "name")
            self.assertFalse(missing_database.exists())

            database = Path(temp_dir) / "forge.db"
            database.touch()
            with self.assertRaises(ValueError):
                MODULE.record_count(database, "users", "name")


if __name__ == "__main__":
    unittest.main()
