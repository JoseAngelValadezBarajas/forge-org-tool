"""WorkspacePersistence: SQLite persistence for the workspaces aggregate."""

from pathlib import Path
from typing import Any
from uuid import uuid4

from forge_org.domain.clock import utc_now

from .base import PersistenceBase
from .common import row_dict


class WorkspacePersistence(PersistenceBase):
    def list_workspaces(self) -> list[dict[str, Any]]:
        rows = self.connection.execute(
            'SELECT * FROM workspaces ORDER BY lower(name), created_at'
        ).fetchall()
        return [dict(row) for row in rows]

    def get_workspace(self, workspace_id: str) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM workspaces WHERE id = ?', (workspace_id,)
            ).fetchone()
        )

    def create_workspace(self, name: str, description: str | None) -> dict[str, Any]:
        now = utc_now()
        workspace_id = str(uuid4())
        self.connection.execute(
            'INSERT INTO workspaces(id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            (workspace_id, name, description, now, now),
        )
        self.connection.commit()
        return self.get_workspace(workspace_id) or {}

    def delete_workspace(self, workspace_id: str, attachment_root: Path | None = None) -> bool:
        attachment_paths: list[Path] = []
        if attachment_root is not None:
            attachment_root = attachment_root.resolve()
            rows = self.connection.execute(
                'SELECT ba.relative_path '
                'FROM bug_attachments ba '
                'JOIN features f ON f.id = ba.feature_id '
                'JOIN projects p ON p.id = f.project_id '
                'WHERE p.workspace_id = ?',
                (workspace_id,),
            ).fetchall()
            for row in rows:
                relative_path = row['relative_path']
                candidate = (attachment_root / relative_path).resolve()
                if (
                    Path(relative_path).name == relative_path
                    and candidate.parent == attachment_root
                ):
                    attachment_paths.append(candidate)
        cursor = self.connection.execute('DELETE FROM workspaces WHERE id = ?', (workspace_id,))
        if cursor.rowcount:
            self.connection.commit()
            for path in attachment_paths:
                path.unlink(missing_ok=True)
            return True
        return False

    def update_workspace(self, workspace_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
        if not values:
            return self.get_workspace(workspace_id)
        assignments = ', '.join(f'{key} = ?' for key in values)
        params = [*values.values(), utc_now(), workspace_id]
        self.connection.execute(
            f'UPDATE workspaces SET {assignments}, updated_at = ? WHERE id = ?', params
        )
        self.connection.commit()
        return self.get_workspace(workspace_id)

    def set_workspace_archive(
        self, workspace_id: str, archived_at: str | None
    ) -> dict[str, Any] | None:
        self.connection.execute(
            'UPDATE workspaces SET archived_at = ?, updated_at = ? WHERE id = ?',
            (archived_at, utc_now(), workspace_id),
        )
        self.connection.commit()
        return self.get_workspace(workspace_id)
