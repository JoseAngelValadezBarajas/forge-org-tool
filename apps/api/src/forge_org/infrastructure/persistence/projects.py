"""ProjectPersistence: SQLite persistence for the projects aggregate."""

from typing import Any
from uuid import uuid4

from forge_org.domain.clock import utc_now

from .base import PersistenceBase
from .common import row_dict


class ProjectPersistence(PersistenceBase):
    def workspace_projects(
        self, workspace_id: str, search: str | None, status: str
    ) -> list[dict[str, Any]]:
        clauses = ['workspace_id = ?']
        params: list[Any] = [workspace_id]
        if search:
            clauses.append("(lower(name) LIKE ? OR lower(coalesce(description, '')) LIKE ?)")
            term = f'%{search.strip().lower()}%'
            params.extend([term, term])
        if status != 'all':
            clauses.append('status = ?')
            params.append(status)
        rows = self.connection.execute(
            f'SELECT * FROM projects WHERE {" AND ".join(clauses)} ORDER BY lower(name), created_at',
            params,
        ).fetchall()
        return [dict(row) for row in rows]

    def get_project(self, workspace_id: str, project_id: str) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM projects WHERE workspace_id = ? AND id = ?',
                (workspace_id, project_id),
            ).fetchone()
        )

    def create_project(
        self, workspace_id: str, name: str, description: str | None
    ) -> dict[str, Any]:
        now = utc_now()
        project_id = str(uuid4())
        self.connection.execute(
            "INSERT INTO projects(id, workspace_id, name, description, status, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, 'active', ?, ?, NULL)",
            (project_id, workspace_id, name, description, now, now),
        )
        self.connection.commit()
        return self.get_project(workspace_id, project_id) or {}

    def update_project(
        self, workspace_id: str, project_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        if not values:
            return self.get_project(workspace_id, project_id)
        assignments = ', '.join(f'{key} = ?' for key in values)
        params = [*values.values(), utc_now(), workspace_id, project_id]
        self.connection.execute(
            f'UPDATE projects SET {assignments}, updated_at = ? WHERE workspace_id = ? AND id = ?',
            params,
        )
        self.connection.commit()
        return self.get_project(workspace_id, project_id)
