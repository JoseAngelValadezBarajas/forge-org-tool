import sqlite3
from typing import Any

from forge_org.infrastructure.sqlite import OrganizationRepository


class KnowledgeService:
    def __init__(self, connection: sqlite3.Connection): self.repository = OrganizationRepository(connection)
    def project(self, workspace_id: str, project_id: str) -> dict[str, Any]:
        project = self.repository.get_project(workspace_id, project_id)
        if project is None: raise LookupError('Project not found')
        return project
    def feature(self, workspace_id: str, project_id: str, feature_id: str) -> dict[str, Any]:
        self.project(workspace_id, project_id)
        feature = self.repository.feature(project_id, feature_id)
        if feature is None: raise LookupError('Feature not found')
        return feature
    def criteria(self, workspace_id: str, project_id: str, feature_id: str) -> list[dict[str, Any]]:
        self.feature(workspace_id, project_id, feature_id); return self.repository.list_criteria(feature_id)
    def create_criterion(self, workspace_id: str, project_id: str, feature_id: str, description: str) -> dict[str, Any]:
        self.feature(workspace_id, project_id, feature_id)
        if not description.strip(): raise ValueError('Description is required')
        return self.repository.create_criterion(feature_id, description)
    def decisions(self, workspace_id: str, project_id: str) -> list[dict[str, Any]]:
        self.project(workspace_id, project_id); return self.repository.list_decisions(project_id)
    def create_decision(self, workspace_id: str, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        project = self.project(workspace_id, project_id)
        if project['status'] != 'active': raise ValueError('Archived projects are read-only')
        required = ('title', 'context', 'decision', 'rationale')
        if any(not str(values.get(key, '')).strip() for key in required): raise ValueError('Decision fields are required')
        return self.repository.create_decision(project_id, values)
    def update_decision(self, workspace_id: str, project_id: str, decision_id: str, values: dict[str, Any]) -> dict[str, Any]:
        self.project(workspace_id, project_id); item = self.repository.update_decision(project_id, decision_id, values)
        if item is None: raise LookupError('Decision not found')
        return item
    def decision_revisions(self, workspace_id: str, project_id: str, decision_id: str) -> list[dict[str, Any]]:
        self.project(workspace_id, project_id)
        if self.repository.get_decision(project_id, decision_id) is None: raise LookupError('Decision not found')
        return self.repository.decision_revisions(project_id, decision_id)
    def accept_decision(self, workspace_id: str, project_id: str, decision_id: str) -> dict[str, Any]:
        self.project(workspace_id, project_id); item = self.repository.accept_decision(project_id, decision_id)
        if item is None: raise LookupError('Decision not found')
        return item
    def link_decision(self, workspace_id: str, project_id: str, decision_id: str, feature_id: str) -> None:
        self.project(workspace_id, project_id); self.feature(workspace_id, project_id, feature_id)
        if self.repository.get_decision(project_id, decision_id) is None: raise LookupError('Decision not found')
        self.repository.link_decision(decision_id, feature_id)
    def invariants(self, workspace_id: str, project_id: str) -> list[dict[str, Any]]:
        self.project(workspace_id, project_id); return self.repository.list_invariants(project_id)
    def create_invariant(self, workspace_id: str, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        project = self.project(workspace_id, project_id)
        if project['status'] != 'active': raise ValueError('Archived projects are read-only')
        if any(not str(values.get(key, '')).strip() for key in ('title', 'statement', 'rationale')): raise ValueError('Invariant fields are required')
        return self.repository.create_invariant(project_id, values)
    def update_invariant(self, workspace_id: str, project_id: str, invariant_id: str, values: dict[str, Any]) -> dict[str, Any]:
        self.project(workspace_id, project_id); item = self.repository.update_invariant(project_id, invariant_id, values)
        if item is None: raise LookupError('Invariant not found')
        return item
    def invariant_revisions(self, workspace_id: str, project_id: str, invariant_id: str) -> list[dict[str, Any]]:
        self.project(workspace_id, project_id)
        if self.repository.get_invariant(project_id, invariant_id) is None: raise LookupError('Invariant not found')
        return self.repository.invariant_revisions(project_id, invariant_id)
    def acknowledge(self, workspace_id: str, project_id: str, feature_id: str, invariant_id: str, expected_revision: int) -> dict[str, Any]:
        self.feature(workspace_id, project_id, feature_id); invariant = self.repository.get_invariant(project_id, invariant_id)
        if invariant is None or (invariant['feature_id'] is not None and invariant['feature_id'] != feature_id): raise LookupError('Invariant does not apply to this feature')
        if int(invariant['revision']) != expected_revision: raise RuntimeError('Invariant changed before acknowledgement; reload the current revision')
        return self.repository.acknowledge(feature_id, invariant_id, expected_revision)
