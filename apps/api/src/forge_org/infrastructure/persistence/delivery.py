"""DeliveryPersistence persistence methods."""

import json
import sqlite3
from typing import Any
from uuid import uuid4

from ..connection import utc_now
from .common import row_dict


class DeliveryPersistence:
    connection: sqlite3.Connection

    def create_evidence(self, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        now, item_id = utc_now(), str(uuid4())
        self.connection.execute(
            'INSERT INTO evidence(id, project_id, feature_id, title, summary, provenance, reference_kind, reference_value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                item_id,
                project_id,
                values.get('feature_id'),
                values['title'],
                values['summary'],
                values['provenance'],
                values['reference_kind'],
                values['reference_value'],
                now,
                now,
            ),
        )
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute(
                    'SELECT * FROM evidence WHERE id = ?', (item_id,)
                ).fetchone()
            )
            or {}
        )

    def get_evidence(self, project_id: str, evidence_id: str) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM evidence WHERE project_id = ? AND id = ?', (project_id, evidence_id)
            ).fetchone()
        )

    def update_evidence(
        self, project_id: str, evidence_id: str, status: str
    ) -> dict[str, Any] | None:
        self.connection.execute(
            'UPDATE evidence SET status = ?, updated_at = ? WHERE project_id = ? AND id = ?',
            (status, utc_now(), project_id, evidence_id),
        )
        self.connection.commit()
        return self.get_evidence(project_id, evidence_id)

    def list_evidence(
        self,
        project_id: str,
        search: str | None = None,
        provenance: str | None = None,
        status: str | None = None,
    ) -> list[dict[str, Any]]:
        clauses, params = ['project_id = ?'], [project_id]
        if search:
            clauses.append('(lower(title) LIKE ? OR lower(summary) LIKE ?)')
            term = f'%{search.strip().lower()}%'
            params.extend([term, term])
        if provenance:
            clauses.append('provenance = ?')
            params.append(provenance)
        if status:
            clauses.append('status = ?')
            params.append(status)
        return [
            dict(row)
            for row in self.connection.execute(
                f'SELECT * FROM evidence WHERE {" AND ".join(clauses)} ORDER BY created_at DESC',
                params,
            ).fetchall()
        ]

    def create_candidate(self, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        now, item_id = utc_now(), str(uuid4())
        self.connection.execute(
            'INSERT INTO release_candidates(id, project_id, title, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            (item_id, project_id, values['title'], values['summary'], now, now),
        )
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute(
                    'SELECT * FROM release_candidates WHERE id = ?', (item_id,)
                ).fetchone()
            )
            or {}
        )

    def get_candidate(self, project_id: str, candidate_id: str) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM release_candidates WHERE project_id = ? AND id = ?',
                (project_id, candidate_id),
            ).fetchone()
        )

    def update_candidate(
        self, project_id: str, candidate_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        assignments = ', '.join(f'{key} = ?' for key in values)
        self.connection.execute(
            f'UPDATE release_candidates SET {assignments}, revision = revision + 1, updated_at = ? WHERE project_id = ? AND id = ?',
            [*values.values(), utc_now(), project_id, candidate_id],
        )
        self.connection.commit()
        return self.get_candidate(project_id, candidate_id)

    def list_candidates(self, project_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM release_candidates WHERE project_id = ? ORDER BY updated_at DESC',
                (project_id,),
            ).fetchall()
        ]

    def save_candidate_revision(self, values: dict[str, Any]) -> dict[str, Any]:
        item_id = str(uuid4())
        self.connection.execute(
            'INSERT INTO release_candidate_revisions(id, candidate_id, revision, status, snapshot_json, fingerprint, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (
                item_id,
                values['candidate_id'],
                values['revision'],
                values['status'],
                values['snapshot_json'],
                values['fingerprint'],
                utc_now(),
            ),
        )
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute(
                    'SELECT * FROM release_candidate_revisions WHERE id = ?', (item_id,)
                ).fetchone()
            )
            or {}
        )

    def list_candidate_revisions(self, candidate_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM release_candidate_revisions WHERE candidate_id = ? ORDER BY revision',
                (candidate_id,),
            ).fetchall()
        ]

    def save_gate(self, values: dict[str, Any]) -> dict[str, Any]:
        item_id = str(uuid4())
        self.connection.execute(
            'INSERT INTO gate_evaluations(id, candidate_id, candidate_revision, outcome, input_fingerprint, blockers, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (
                item_id,
                values['candidate_id'],
                values['candidate_revision'],
                values['outcome'],
                values['input_fingerprint'],
                json.dumps(values['blockers'], sort_keys=True),
                utc_now(),
            ),
        )
        self.connection.commit()
        return {**values, 'id': item_id}

    def list_gates(self, candidate_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM gate_evaluations WHERE candidate_id = ? ORDER BY created_at DESC',
                (candidate_id,),
            ).fetchall()
        ]

    def save_verification(self, values: dict[str, Any]) -> dict[str, Any]:
        item_id = str(uuid4())
        self.connection.execute(
            'INSERT INTO verification_evaluations(id, project_id, rule_id, candidate_id, outcome, input_fingerprint, blockers, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (
                item_id,
                values['project_id'],
                values['rule_id'],
                values.get('candidate_id'),
                values['outcome'],
                values['input_fingerprint'],
                json.dumps(values['blockers'], sort_keys=True),
                utc_now(),
            ),
        )
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute(
                    'SELECT * FROM verification_evaluations WHERE id = ?', (item_id,)
                ).fetchone()
            )
            or {}
        )

    def list_verifications(self, project_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM verification_evaluations WHERE project_id = ? ORDER BY created_at DESC',
                (project_id,),
            ).fetchall()
        ]

    def get_verification(self, project_id: str, evaluation_id: str) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM verification_evaluations WHERE project_id = ? AND id = ?',
                (project_id, evaluation_id),
            ).fetchone()
        )

    def save_manifest(self, values: dict[str, Any]) -> dict[str, Any]:
        existing = self.connection.execute(
            'SELECT * FROM release_manifests WHERE candidate_id = ? AND gate_evaluation_id = ?',
            (values['candidate_id'], values['gate_evaluation_id']),
        ).fetchone()
        if existing is not None:
            return dict(existing)
        item_id = str(uuid4())
        self.connection.execute(
            'INSERT INTO release_manifests(id, candidate_id, gate_evaluation_id, schema_version, fingerprint, status, payload_json, markdown, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                item_id,
                values['candidate_id'],
                values['gate_evaluation_id'],
                values['schema_version'],
                values['fingerprint'],
                values['status'],
                values['payload_json'],
                values['markdown'],
                utc_now(),
            ),
        )
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute(
                    'SELECT * FROM release_manifests WHERE id = ?', (item_id,)
                ).fetchone()
            )
            or {}
        )

    def get_manifest(
        self, candidate_id: str, manifest_id: str | None = None
    ) -> dict[str, Any] | None:
        if manifest_id:
            return row_dict(
                self.connection.execute(
                    'SELECT m.* FROM release_manifests m JOIN release_candidates c ON c.id = m.candidate_id WHERE m.candidate_id = ? AND m.id = ?',
                    (candidate_id, manifest_id),
                ).fetchone()
            )
        return row_dict(
            self.connection.execute(
                'SELECT * FROM release_manifests WHERE candidate_id = ? ORDER BY created_at DESC, id DESC LIMIT 1',
                (candidate_id,),
            ).fetchone()
        )
