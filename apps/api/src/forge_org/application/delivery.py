import hashlib
import json
from typing import Any

from forge_org.infrastructure.sqlite import OrganizationRepository


class DeliveryService:
    def __init__(self, connection): self.repository = OrganizationRepository(connection)
    def _project(self, workspace_id: str, project_id: str) -> dict[str, Any]:
        project = self.repository.get_project(workspace_id, project_id)
        if project is None: raise LookupError('Project not found')
        return project
    def evidence_create(self, workspace_id: str, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        project = self._project(workspace_id, project_id)
        if project['status'] != 'active': raise ValueError('Archived projects are read-only')
        if values.get('feature_id') and self.repository.feature(project_id, values['feature_id']) is None: raise LookupError('Feature not found')
        if values['provenance'] not in {'REPORTED', 'OBSERVED', 'VERIFIED', 'UNKNOWN'}: raise ValueError('Unknown evidence provenance')
        if not values.get('title', '').strip() or not values.get('summary', '').strip(): raise ValueError('Evidence title and summary are required')
        return self.repository.create_evidence(project_id, values)
    def evidence_list(self, workspace_id: str, project_id: str) -> list[dict[str, Any]]: self._project(workspace_id, project_id); return self.repository.list_evidence(project_id)
    def evidence_invalidate(self, workspace_id: str, project_id: str, evidence_id: str) -> dict[str, Any]:
        self._project(workspace_id, project_id); item = self.repository.get_evidence(project_id, evidence_id)
        if item is None: raise LookupError('Evidence not found')
        return self.repository.update_evidence(project_id, evidence_id, 'INVALIDATED') or item
    def candidate_create(self, workspace_id: str, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        project = self._project(workspace_id, project_id)
        if project['status'] != 'active': raise ValueError('Archived projects are read-only')
        if not values.get('title', '').strip() or not values.get('summary', '').strip(): raise ValueError('Candidate title and summary are required')
        return self.repository.create_candidate(project_id, values)
    def candidates(self, workspace_id: str, project_id: str) -> list[dict[str, Any]]: self._project(workspace_id, project_id); return self.repository.list_candidates(project_id)
    def freeze(self, workspace_id: str, project_id: str, candidate_id: str, expected_revision: int) -> dict[str, Any]:
        project = self._project(workspace_id, project_id); item = self.repository.get_candidate(project_id, candidate_id)
        if item is None: raise LookupError('Release candidate not found')
        if project['status'] != 'active' or int(item['revision']) != expected_revision: raise ValueError('Candidate revision is stale or project is read-only')
        snapshot = {'id': item['id'], 'project_id': project_id, 'title': item['title'], 'summary': item['summary'], 'status': 'FROZEN', 'revision': int(item['revision']) + 1}
        canonical = json.dumps(snapshot, sort_keys=True, separators=(',', ':')); fingerprint = hashlib.sha256(canonical.encode()).hexdigest()
        self.repository.save_candidate_revision({'candidate_id': candidate_id, 'revision': int(item['revision']) + 1, 'status': 'FROZEN', 'snapshot_json': canonical, 'fingerprint': fingerprint})
        return self.repository.update_candidate(project_id, candidate_id, {'status': 'FROZEN', 'fingerprint': fingerprint}) or item
    def gate(self, workspace_id: str, project_id: str, candidate_id: str, save: bool = False) -> dict[str, Any]:
        self._project(workspace_id, project_id); item = self.repository.get_candidate(project_id, candidate_id)
        if item is None: raise LookupError('Release candidate not found')
        blockers = [] if item['status'] == 'FROZEN' and any(e['status'] == 'ACTIVE' and e['provenance'] == 'VERIFIED' for e in self.repository.list_evidence(project_id)) else ['A frozen candidate and active VERIFIED evidence are required']
        result = {'candidate_id': candidate_id, 'candidate_revision': item['revision'], 'outcome': 'PASS' if not blockers else 'BLOCKED', 'input_fingerprint': item.get('fingerprint') or '', 'blockers': blockers}
        return self.repository.save_gate(result) if save else result
