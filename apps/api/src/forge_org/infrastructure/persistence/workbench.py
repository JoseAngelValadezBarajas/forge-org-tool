"""WorkbenchPersistence persistence methods."""

import sqlite3
from typing import Any
from uuid import uuid4

from ..connection import utc_now
from .common import row_dict


class WorkbenchPersistence:
    connection: sqlite3.Connection

    def create_run(self, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        now, run_id = utc_now(), str(uuid4())
        self.connection.execute(
            'INSERT INTO runs(id, project_id, feature_id, context_package_id, title, description, execution_mode, executor_type, executor_label, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                run_id,
                project_id,
                values.get('feature_id'),
                values.get('context_package_id'),
                values['title'],
                values.get('description'),
                values.get('execution_mode', 'manual'),
                values.get('executor_type', 'human'),
                values.get('executor_label'),
                now,
                now,
            ),
        )
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute('SELECT * FROM runs WHERE id = ?', (run_id,)).fetchone()
            )
            or {}
        )

    def get_run(self, project_id: str, run_id: str) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM runs WHERE project_id = ? AND id = ?', (project_id, run_id)
            ).fetchone()
        )

    def update_run(
        self, project_id: str, run_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        if not values:
            self.connection.execute(
                'UPDATE runs SET version = version + 1, updated_at = ? WHERE project_id = ? AND id = ?',
                (utc_now(), project_id, run_id),
            )
            self.connection.commit()
            return self.get_run(project_id, run_id)
        assignments = ', '.join(f'{key} = ?' for key in values)
        self.connection.execute(
            f'UPDATE runs SET {assignments}, version = version + 1, updated_at = ? WHERE project_id = ? AND id = ?',
            [*values.values(), utc_now(), project_id, run_id],
        )
        self.connection.commit()
        return self.get_run(project_id, run_id)

    def list_runs(
        self,
        project_id: str,
        feature_id: str | None = None,
        status: str | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        clauses, params = ['project_id = ?'], [project_id]
        if feature_id:
            clauses.append('feature_id = ?')
            params.append(feature_id)
        if status:
            clauses.append('status = ?')
            params.append(status)
        if search:
            clauses.append("(lower(title) LIKE ? OR lower(coalesce(description, '')) LIKE ?)")
            term = f'%{search.strip().lower()}%'
            params.extend([term, term])
        return [
            dict(row)
            for row in self.connection.execute(
                f'SELECT * FROM runs WHERE {" AND ".join(clauses)} ORDER BY created_at DESC', params
            ).fetchall()
        ]

    def create_event(self, run_id: str, values: dict[str, Any]) -> dict[str, Any]:
        event_id = str(uuid4())
        self.connection.execute(
            'INSERT INTO run_events(id, run_id, event_type, title, description, occurred_at, supersedes_event_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (
                event_id,
                run_id,
                values['event_type'],
                values['title'],
                values.get('description'),
                values.get('occurred_at'),
                values.get('supersedes_event_id'),
                utc_now(),
            ),
        )
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute(
                    'SELECT * FROM run_events WHERE id = ?', (event_id,)
                ).fetchone()
            )
            or {}
        )

    def list_events(self, run_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM run_events WHERE run_id = ? ORDER BY created_at', (run_id,)
            ).fetchall()
        ]

    def create_handoff(self, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        now, handoff_id = utc_now(), str(uuid4())
        self.connection.execute(
            'INSERT INTO handoffs(id, project_id, feature_id, run_id, context_package_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (
                handoff_id,
                project_id,
                values.get('feature_id'),
                values['run_id'],
                values.get('context_package_id'),
                values.get('title', ''),
                now,
                now,
            ),
        )
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute(
                    'SELECT * FROM handoffs WHERE id = ?', (handoff_id,)
                ).fetchone()
            )
            or {}
        )

    def get_handoff(self, project_id: str, handoff_id: str) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM handoffs WHERE project_id = ? AND id = ?', (project_id, handoff_id)
            ).fetchone()
        )

    def list_handoffs(self, project_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM handoffs WHERE project_id = ? ORDER BY updated_at DESC',
                (project_id,),
            ).fetchall()
        ]

    def update_handoff(
        self, project_id: str, handoff_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        assignments = ', '.join(f'{key} = ?' for key in values)
        self.connection.execute(
            f'UPDATE handoffs SET {assignments}, version = version + 1, updated_at = ? WHERE project_id = ? AND id = ?',
            [*values.values(), utc_now(), project_id, handoff_id],
        )
        self.connection.commit()
        return self.get_handoff(project_id, handoff_id)

    def create_handoff_revision(self, values: dict[str, Any]) -> dict[str, Any]:
        revision_id = str(uuid4())
        self.connection.execute(
            'INSERT INTO handoff_revisions(id, handoff_id, revision, title, summary, next_actions, schema_version, fingerprint, payload_json, markdown, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                revision_id,
                values['handoff_id'],
                values['revision'],
                values['title'],
                values['summary'],
                values['next_actions'],
                values['schema_version'],
                values['fingerprint'],
                values['payload_json'],
                values['markdown'],
                utc_now(),
            ),
        )
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute(
                    'SELECT * FROM handoff_revisions WHERE id = ?', (revision_id,)
                ).fetchone()
            )
            or {}
        )

    def list_handoff_revisions(self, handoff_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM handoff_revisions WHERE handoff_id = ? ORDER BY revision',
                (handoff_id,),
            ).fetchall()
        ]

    def get_handoff_revision(self, handoff_id: str, revision: int) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM handoff_revisions WHERE handoff_id = ? AND revision = ?',
                (handoff_id, revision),
            ).fetchone()
        )

    def acknowledge_handoff(
        self, handoff_id: str, revision: int, acknowledged_by: str
    ) -> dict[str, Any]:
        item = {
            'id': str(uuid4()),
            'handoff_id': handoff_id,
            'revision': revision,
            'acknowledged_by': acknowledged_by,
            'acknowledged_at': utc_now(),
        }
        self.connection.execute(
            'INSERT INTO handoff_acknowledgements(id, handoff_id, revision, acknowledged_by, acknowledged_at) VALUES (?, ?, ?, ?, ?)',
            tuple(item.values()),
        )
        self.connection.commit()
        return item
