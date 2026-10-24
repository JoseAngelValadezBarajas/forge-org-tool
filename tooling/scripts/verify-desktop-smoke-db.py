"""Read-only assertions for synthetic records created by the installed-app smoke."""

from __future__ import annotations

import argparse
import sqlite3
from contextlib import closing
from pathlib import Path

TABLES = {
    "workspaces": ("workspaces", "name"),
    "projects": ("projects", "name"),
}


def record_count(database_path: Path, table_key: str, name: str) -> int:
    if table_key not in TABLES:
        raise ValueError(f"Unsupported synthetic smoke table: {table_key}")
    if not database_path.is_file():
        raise FileNotFoundError(
            f"The isolated smoke database does not exist: {database_path}"
        )

    table, column = TABLES[table_key]
    with closing(sqlite3.connect(database_path)) as connection:
        return int(
            connection.execute(
                f"SELECT COUNT(*) FROM {table} WHERE {column} = ?", (name,)
            ).fetchone()[0]
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("database", type=Path)
    parser.add_argument("table", choices=TABLES)
    parser.add_argument("name")
    args = parser.parse_args()

    try:
        count = record_count(args.database, args.table, args.name)
    except (OSError, sqlite3.Error, ValueError) as error:
        parser.error(str(error))
    if count != 1:
        parser.error(
            f"Expected exactly one synthetic {args.table} record named {args.name!r}; found {count}."
        )
    print(count)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
