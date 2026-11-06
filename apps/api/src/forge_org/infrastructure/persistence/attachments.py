"""SQLite adapter for the Bug attachment metadata port."""

import sqlite3
from collections.abc import Callable
from typing import Any


class SqliteAttachmentStore:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def find_bug(
        self, workspace_id: str, project_id: str, feature_id: str
    ) -> dict[str, Any] | None:
        row = self.connection.execute(
            'SELECT f.*, p.status AS project_status FROM features f JOIN projects p ON p.id = f.project_id '
            "WHERE p.workspace_id = ? AND p.id = ? AND f.id = ? AND f.kind = 'bug'",
            (workspace_id, project_id, feature_id),
        ).fetchone()
        return None if row is None else dict(row)

    def list_attachments(self, feature_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT id, feature_id, file_name, content_type, byte_size, sha256, created_at '
                'FROM bug_attachments WHERE feature_id = ? ORDER BY created_at, id',
                (feature_id,),
            ).fetchall()
        ]

    def get_attachment(self, feature_id: str, attachment_id: str) -> dict[str, Any] | None:
        row = self.connection.execute(
            'SELECT * FROM bug_attachments WHERE id = ? AND feature_id = ?',
            (attachment_id, feature_id),
        ).fetchone()
        return None if row is None else dict(row)

    def add_attachment(
        self,
        feature_id: str,
        attachment: dict[str, Any],
        *,
        limit: int,
        before_commit: Callable[[], None],
    ) -> bool:
        """Insert atomically; return False when the per-bug limit is already reached.

        ``before_commit`` runs inside the write transaction (used to persist the file),
        so a failure there or in the insert rolls the metadata back.
        """
        self.connection.execute('BEGIN IMMEDIATE')
        count = self.connection.execute(
            'SELECT count(*) FROM bug_attachments WHERE feature_id = ?', (feature_id,)
        ).fetchone()[0]
        if count >= limit:
            self.connection.rollback()
            return False
        try:
            before_commit()
            self.connection.execute(
                'INSERT INTO bug_attachments(id, feature_id, relative_path, file_name, '
                'content_type, byte_size, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                (
                    attachment['id'],
                    feature_id,
                    attachment['relative_path'],
                    attachment['file_name'],
                    attachment['content_type'],
                    attachment['byte_size'],
                    attachment['sha256'],
                    attachment['created_at'],
                ),
            )
            self.connection.commit()
        except Exception:
            self.connection.rollback()
            raise
        return True

    def delete_attachment(self, feature_id: str, attachment_id: str) -> None:
        self.connection.execute(
            'DELETE FROM bug_attachments WHERE id = ? AND feature_id = ?',
            (attachment_id, feature_id),
        )
        self.connection.commit()
