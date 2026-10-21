"""RepositoryContextPersistence persistence methods."""

import sqlite3
from typing import Any
from uuid import uuid4

from ..connection import utc_now
from .common import row_dict


class RepositoryContextPersistence:
    connection: sqlite3.Connection

    def create_repository(self, project_id: str, root_path: str) -> dict[str, Any]:
        now, repository_id = utc_now(), str(uuid4())
        self.connection.execute(
            'INSERT INTO repositories(id, project_id, root_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            (repository_id, project_id, root_path, now, now),
        )
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute(
                    'SELECT * FROM repositories WHERE id = ?', (repository_id,)
                ).fetchone()
            )
            or {}
        )

    def list_repositories(self, project_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM repositories WHERE project_id = ? ORDER BY root_path', (project_id,)
            ).fetchall()
        ]

    def get_repository(self, project_id: str, repository_id: str) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM repositories WHERE project_id = ? AND id = ?',
                (project_id, repository_id),
            ).fetchone()
        )

    def disconnect_repository(self, project_id: str, repository_id: str) -> dict[str, Any] | None:
        self.connection.execute(
            "UPDATE repositories SET status = 'disconnected', updated_at = ? WHERE project_id = ? AND id = ?",
            (utc_now(), project_id, repository_id),
        )
        self.connection.commit()
        return self.get_repository(project_id, repository_id)

    def create_observation(self, values: dict[str, Any]) -> dict[str, Any]:
        observation_id = str(uuid4())
        self.connection.execute(
            'INSERT INTO git_observations(id, repository_id, observed_at, head_sha, branch, detached, unborn, clean, tracked_modified_count, staged_count, untracked_count, observer_version, status, error_code, source_content_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (
                observation_id,
                values['repository_id'],
                values['observed_at'],
                values.get('head_sha'),
                values.get('branch'),
                values.get('detached', False),
                values.get('unborn', False),
                values.get('clean'),
                values.get('tracked_modified_count', 0),
                values.get('staged_count', 0),
                values.get('untracked_count', 0),
                values['observer_version'],
                values['status'],
                values.get('error_code'),
                False,
            ),
        )
        self.connection.commit()
        return (
            row_dict(
                self.connection.execute(
                    'SELECT * FROM git_observations WHERE id = ?', (observation_id,)
                ).fetchone()
            )
            or {}
        )

    def list_observations(self, repository_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM git_observations WHERE repository_id = ? ORDER BY observed_at DESC, id DESC',
                (repository_id,),
            ).fetchall()
        ]

    def link_repository(self, feature_id: str, repository_id: str) -> dict[str, Any]:
        self.connection.execute(
            'INSERT INTO feature_repository_links(feature_id, repository_id) VALUES (?, ?)',
            (feature_id, repository_id),
        )
        self.connection.commit()
        return {'feature_id': feature_id, 'repository_id': repository_id}

    def feature_repositories(self, feature_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT r.* FROM repositories r JOIN feature_repository_links l ON l.repository_id = r.id WHERE l.feature_id = ?',
                (feature_id,),
            ).fetchall()
        ]

    def unlink_repository(self, feature_id: str, repository_id: str) -> bool:
        cursor = self.connection.execute(
            'DELETE FROM feature_repository_links WHERE feature_id = ? AND repository_id = ?',
            (feature_id, repository_id),
        )
        self.connection.commit()
        return cursor.rowcount == 1

    def find_context_package(
        self, feature_id: str, schema_version: str, fingerprint: str
    ) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM context_packages WHERE feature_id = ? AND schema_version = ? AND fingerprint = ?',
                (feature_id, schema_version, fingerprint),
            ).fetchone()
        )

    def save_context_package(self, values: dict[str, Any]) -> dict[str, Any]:
        existing = self.find_context_package(
            values['feature_id'], values['schema_version'], values['fingerprint']
        )
        if existing is not None:
            return existing
        package_id = str(uuid4())
        self.connection.execute(
            'INSERT INTO context_packages(id, project_id, feature_id, schema_version, fingerprint, payload_json, markdown, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (
                package_id,
                values['project_id'],
                values['feature_id'],
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
                    'SELECT * FROM context_packages WHERE id = ?', (package_id,)
                ).fetchone()
            )
            or {}
        )

    def list_context_packages(self, feature_id: str) -> list[dict[str, Any]]:
        return [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM context_packages WHERE feature_id = ? ORDER BY created_at DESC, id DESC',
                (feature_id,),
            ).fetchall()
        ]

    def get_context_package(self, feature_id: str, package_id: str) -> dict[str, Any] | None:
        return row_dict(
            self.connection.execute(
                'SELECT * FROM context_packages WHERE feature_id = ? AND id = ?',
                (feature_id, package_id),
            ).fetchone()
        )
