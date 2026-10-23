"""Verified SQLite online backups created before forward migrations."""

import sqlite3
import uuid
from contextlib import closing
from datetime import UTC, datetime
from pathlib import Path


def backup_before_migration(path: Path, *, current_version: int) -> Path | None:
    """Create an integrity-checked, atomic backup for an existing older database."""
    if not path.is_file() or path.stat().st_size == 0:
        return None

    with closing(sqlite3.connect(path)) as source:
        has_versions = source.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_version'"
        ).fetchone()
        version = (
            source.execute('SELECT max(version) FROM schema_version').fetchone()[0]
            if has_versions
            else 0
        )
        if version > current_version:
            return None
        if version == current_version:
            return None

        suffix = datetime.now(UTC).strftime('%Y%m%dT%H%M%S%fZ')
        backup_path = path.with_name(
            f'{path.name}.pre-migration-{suffix}-{uuid.uuid4().hex[:8]}.bak'
        )
        temporary_path = backup_path.with_suffix('.tmp')
        try:
            with closing(sqlite3.connect(temporary_path)) as target:
                source.backup(target)
                result = target.execute('PRAGMA integrity_check').fetchone()[0]
                if result != 'ok':
                    raise RuntimeError(f'SQLite migration backup integrity check failed: {result}')
                target.commit()
            temporary_path.replace(backup_path)
            return backup_path
        finally:
            temporary_path.unlink(missing_ok=True)
