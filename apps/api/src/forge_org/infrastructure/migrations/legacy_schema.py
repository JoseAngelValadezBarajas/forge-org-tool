"""Legacy-compatible base schema migration.

Kept byte-for-byte at the SQL level during the persistence decomposition.
"""

import sqlite3


def _apply_legacy_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY
        );
        CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS uq_workspaces_name_ci
            ON workspaces(lower(name));
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            archived_at TEXT
        );
        CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_workspace_name_ci
            ON projects(workspace_id, lower(name));
        CREATE TABLE IF NOT EXISTS epics (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            title TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'planning',
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS features (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            epic_id TEXT REFERENCES epics(id) ON DELETE SET NULL, title TEXT NOT NULL,
            description TEXT, goal TEXT, priority TEXT NOT NULL DEFAULT 'medium',
            status TEXT NOT NULL DEFAULT 'backlog', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS ix_features_project ON features(project_id, status, priority);
        CREATE TABLE IF NOT EXISTS acceptance_criteria (
            id TEXT PRIMARY KEY, feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            description TEXT NOT NULL, satisfied INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY, feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            title TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'todo', position INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS feature_dependencies (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            blocking_feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            blocked_feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            UNIQUE(blocking_feature_id, blocked_feature_id)
        );
        CREATE TABLE IF NOT EXISTS decisions (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            title TEXT NOT NULL, context TEXT NOT NULL, decision TEXT NOT NULL, rationale TEXT NOT NULL,
            alternatives_considered TEXT, tradeoffs TEXT, status TEXT NOT NULL DEFAULT 'proposed',
            revision INTEGER NOT NULL DEFAULT 1, superseded_by_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS decision_revisions (
            id TEXT PRIMARY KEY, decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
            revision INTEGER NOT NULL, title TEXT NOT NULL, context TEXT NOT NULL, decision TEXT NOT NULL,
            rationale TEXT NOT NULL, alternatives_considered TEXT, tradeoffs TEXT, status TEXT NOT NULL,
            superseded_by_id TEXT, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS decision_feature_links (
            decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
            feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            PRIMARY KEY(decision_id, feature_id)
        );
        CREATE TABLE IF NOT EXISTS invariants (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            feature_id TEXT REFERENCES features(id) ON DELETE CASCADE, title TEXT NOT NULL,
            statement TEXT NOT NULL, rationale TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
            revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS invariant_revisions (
            id TEXT PRIMARY KEY, invariant_id TEXT NOT NULL REFERENCES invariants(id) ON DELETE CASCADE,
            revision INTEGER NOT NULL, title TEXT NOT NULL, statement TEXT NOT NULL, rationale TEXT NOT NULL,
            status TEXT NOT NULL, feature_id TEXT, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS invariant_acknowledgements (
            feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            invariant_id TEXT NOT NULL REFERENCES invariants(id) ON DELETE CASCADE,
            acknowledged_revision INTEGER NOT NULL, acknowledged_at TEXT NOT NULL,
            PRIMARY KEY(feature_id, invariant_id)
        );
        CREATE TABLE IF NOT EXISTS readiness_evaluations (
            id TEXT PRIMARY KEY, feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            evaluated_at TEXT NOT NULL, rule_set_version TEXT NOT NULL, input_fingerprint TEXT NOT NULL,
            outcome TEXT NOT NULL, passed_checks TEXT NOT NULL, failed_checks TEXT NOT NULL,
            blockers TEXT NOT NULL, results TEXT NOT NULL, input_snapshot TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS repositories (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            root_path TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'connected', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            UNIQUE(project_id, root_path)
        );
        CREATE TABLE IF NOT EXISTS git_observations (
            id TEXT PRIMARY KEY, repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
            observed_at TEXT NOT NULL, head_sha TEXT, branch TEXT, detached INTEGER NOT NULL DEFAULT 0,
            unborn INTEGER NOT NULL DEFAULT 0, clean INTEGER, tracked_modified_count INTEGER NOT NULL DEFAULT 0,
            staged_count INTEGER NOT NULL DEFAULT 0, untracked_count INTEGER NOT NULL DEFAULT 0,
            observer_version TEXT NOT NULL, status TEXT NOT NULL, error_code TEXT, source_content_read INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS feature_repository_links (
            feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
            PRIMARY KEY(feature_id, repository_id)
        );
        CREATE TABLE IF NOT EXISTS context_packages (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
            schema_version TEXT NOT NULL, fingerprint TEXT NOT NULL, payload_json TEXT NOT NULL,
            markdown TEXT NOT NULL, created_at TEXT NOT NULL,
            UNIQUE(feature_id, schema_version, fingerprint)
        );
        CREATE TABLE IF NOT EXISTS runs (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            feature_id TEXT REFERENCES features(id) ON DELETE SET NULL, context_package_id TEXT,
            title TEXT NOT NULL, description TEXT, execution_mode TEXT NOT NULL DEFAULT 'manual',
            executor_type TEXT NOT NULL DEFAULT 'human', executor_label TEXT, status TEXT NOT NULL DEFAULT 'PLANNED',
            version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS run_events (
            id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
            event_type TEXT NOT NULL, title TEXT NOT NULL, description TEXT, origin TEXT NOT NULL DEFAULT 'manual',
            occurred_at TEXT, supersedes_event_id TEXT, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS handoffs (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            feature_id TEXT REFERENCES features(id) ON DELETE SET NULL, run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
            context_package_id TEXT, title TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', next_actions TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'DRAFT', current_revision INTEGER, version INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS handoff_revisions (
            id TEXT PRIMARY KEY, handoff_id TEXT NOT NULL REFERENCES handoffs(id) ON DELETE CASCADE,
            revision INTEGER NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, next_actions TEXT NOT NULL,
            schema_version TEXT NOT NULL, fingerprint TEXT NOT NULL, payload_json TEXT NOT NULL, markdown TEXT NOT NULL, created_at TEXT NOT NULL,
            UNIQUE(handoff_id, revision)
        );
        CREATE TABLE IF NOT EXISTS handoff_acknowledgements (
            id TEXT PRIMARY KEY, handoff_id TEXT NOT NULL REFERENCES handoffs(id) ON DELETE CASCADE,
            revision INTEGER NOT NULL, acknowledged_by TEXT NOT NULL, acknowledged_at TEXT NOT NULL,
            UNIQUE(handoff_id, revision)
        );
        CREATE TABLE IF NOT EXISTS evidence (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            feature_id TEXT REFERENCES features(id) ON DELETE SET NULL, title TEXT NOT NULL, summary TEXT NOT NULL,
            provenance TEXT NOT NULL, reference_kind TEXT NOT NULL, reference_value TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'ACTIVE', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS release_candidates (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            title TEXT NOT NULL, summary TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'DRAFT', revision INTEGER NOT NULL DEFAULT 1,
            fingerprint TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS release_candidate_revisions (
            id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES release_candidates(id) ON DELETE CASCADE,
            revision INTEGER NOT NULL, status TEXT NOT NULL, snapshot_json TEXT NOT NULL, fingerprint TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS gate_evaluations (
            id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES release_candidates(id) ON DELETE CASCADE,
            candidate_revision INTEGER NOT NULL, outcome TEXT NOT NULL, input_fingerprint TEXT NOT NULL,
            blockers TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS verification_evaluations (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            rule_id TEXT NOT NULL, candidate_id TEXT REFERENCES release_candidates(id) ON DELETE SET NULL,
            outcome TEXT NOT NULL, input_fingerprint TEXT NOT NULL, blockers TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS release_manifests (
            id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES release_candidates(id) ON DELETE CASCADE,
            gate_evaluation_id TEXT NOT NULL REFERENCES gate_evaluations(id) ON DELETE RESTRICT,
            schema_version TEXT NOT NULL, fingerprint TEXT NOT NULL, status TEXT NOT NULL,
            payload_json TEXT NOT NULL, markdown TEXT NOT NULL, created_at TEXT NOT NULL,
            UNIQUE(candidate_id, gate_evaluation_id)
        );
        INSERT OR IGNORE INTO schema_version(version) VALUES (1);
        """
    )
    connection.commit()
