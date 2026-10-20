import hashlib
import json
from typing import Any

from forge_org.infrastructure.sqlite import OrganizationRepository


class DeliveryService:
    def __init__(self, connection): self.repository = OrganizationRepository(connection)
    VERIFICATION_RULES = (
        {'id': 'candidate-frozen', 'label': 'Candidate is frozen', 'description': 'The selected release candidate is frozen.'},
        {'id': 'verified-evidence-present', 'label': 'Verified evidence is present', 'description': 'At least one active evidence record has VERIFIED provenance.'},
        {'id': 'release-gate-passes', 'label': 'Release gate passes', 'description': 'The selected candidate has a stored PASS gate evaluation at its current revision.'},
    )
    MANIFEST_SCHEMA = 'forge-release-manifest-v1'
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
    def evidence_list(self, workspace_id: str, project_id: str, search: str | None = None, provenance: str | None = None, status: str | None = None) -> list[dict[str, Any]]: self._project(workspace_id, project_id); return self.repository.list_evidence(project_id, search, provenance, status)
    def evidence_get(self, workspace_id: str, project_id: str, evidence_id: str) -> dict[str, Any]:
        self._project(workspace_id, project_id); item = self.repository.get_evidence(project_id, evidence_id)
        if item is None: raise LookupError('Evidence not found')
        return item
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
    def candidate_get(self, workspace_id: str, project_id: str, candidate_id: str) -> dict[str, Any]:
        self._project(workspace_id, project_id); item = self.repository.get_candidate(project_id, candidate_id)
        if item is None: raise LookupError('Release candidate not found')
        return item
    def candidate_update(self, workspace_id: str, project_id: str, candidate_id: str, values: dict[str, Any]) -> dict[str, Any]:
        project = self._project(workspace_id, project_id); item = self.candidate_get(workspace_id, project_id, candidate_id)
        if project['status'] != 'active': raise ValueError('Archived projects are read-only')
        if item['status'] != 'DRAFT': raise ValueError('Only draft candidates can be edited')
        if not values: return item
        if 'title' in values and not values['title'].strip(): raise ValueError('Candidate title is required')
        if 'summary' in values and not values['summary'].strip(): raise ValueError('Candidate summary is required')
        return self.repository.update_candidate(project_id, candidate_id, values) or item
    def candidate_history(self, workspace_id: str, project_id: str, candidate_id: str) -> list[dict[str, Any]]:
        self.candidate_get(workspace_id, project_id, candidate_id); return self.repository.list_candidate_revisions(candidate_id)
    def candidate_gate_history(self, workspace_id: str, project_id: str, candidate_id: str) -> list[dict[str, Any]]:
        self.candidate_get(workspace_id, project_id, candidate_id)
        return [{**item, 'blockers': json.loads(item['blockers'])} for item in self.repository.list_gates(candidate_id)]
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

    def verification_rules(self, workspace_id: str, project_id: str) -> list[dict[str, str]]:
        self._project(workspace_id, project_id)
        return list(self.VERIFICATION_RULES)

    def _verification(self, workspace_id: str, project_id: str, rule_id: str, candidate_id: str | None) -> dict[str, Any]:
        self._project(workspace_id, project_id)
        rule = next((item for item in self.VERIFICATION_RULES if item['id'] == rule_id), None)
        if rule is None: raise ValueError('Unknown verification rule')
        candidate = self.candidate_get(workspace_id, project_id, candidate_id) if candidate_id else None
        evidence = self.repository.list_evidence(project_id)
        gates = self.repository.list_gates(candidate_id) if candidate_id else []
        snapshot = {'rule_id': rule_id, 'candidate': candidate, 'evidence': evidence, 'gates': gates}
        input_fingerprint = hashlib.sha256(json.dumps(snapshot, sort_keys=True, separators=(',', ':'), default=str).encode()).hexdigest()
        blockers: list[str] = []
        if rule_id == 'candidate-frozen' and (candidate is None or candidate['status'] != 'FROZEN'):
            blockers.append('The selected candidate is not frozen')
        if rule_id == 'verified-evidence-present' and not any(item['status'] == 'ACTIVE' and item['provenance'] == 'VERIFIED' for item in evidence):
            blockers.append('No active VERIFIED evidence is present')
        if rule_id == 'release-gate-passes' and not any(item['outcome'] == 'PASS' and candidate and item['candidate_revision'] == candidate['revision'] for item in gates):
            blockers.append('No PASS gate evaluation exists for the current candidate revision')
        return {'project_id': project_id, 'rule_id': rule_id, 'candidate_id': candidate_id, 'outcome': 'PASS' if not blockers else 'BLOCKED', 'input_fingerprint': input_fingerprint, 'blockers': blockers}

    def verification_preview(self, workspace_id: str, project_id: str, rule_id: str, candidate_id: str | None) -> dict[str, Any]:
        return self._verification(workspace_id, project_id, rule_id, candidate_id)

    def verification_evaluate(self, workspace_id: str, project_id: str, rule_id: str, candidate_id: str | None) -> dict[str, Any]:
        saved = self.repository.save_verification(self._verification(workspace_id, project_id, rule_id, candidate_id))
        return {**saved, 'blockers': json.loads(saved['blockers']), 'stale': False}

    def _verification_response(self, item: dict[str, Any], workspace_id: str, project_id: str) -> dict[str, Any]:
        current = self._verification(workspace_id, project_id, item['rule_id'], item['candidate_id'])
        return {**item, 'blockers': json.loads(item['blockers']), 'stale': current['input_fingerprint'] != item['input_fingerprint']}

    def verification_list(self, workspace_id: str, project_id: str) -> list[dict[str, Any]]:
        self._project(workspace_id, project_id)
        return [self._verification_response(item, workspace_id, project_id) for item in self.repository.list_verifications(project_id)]

    def verification_get(self, workspace_id: str, project_id: str, evaluation_id: str) -> dict[str, Any]:
        self._project(workspace_id, project_id)
        item = self.repository.get_verification(project_id, evaluation_id)
        if item is None: raise LookupError('Verification evaluation not found')
        return self._verification_response(item, workspace_id, project_id)

    def manifest_save(self, workspace_id: str, project_id: str, candidate_id: str, gate_evaluation_id: str) -> dict[str, Any]:
        project = self._project(workspace_id, project_id)
        candidate = self.candidate_get(workspace_id, project_id, candidate_id)
        if candidate['status'] != 'FROZEN': raise ValueError('Only frozen candidates can have manifests')
        gate = next((item for item in self.repository.list_gates(candidate_id) if item['id'] == gate_evaluation_id), None)
        if gate is None: raise LookupError('Gate evaluation not found')
        if gate['outcome'] != 'PASS' or int(gate['candidate_revision']) != int(candidate['revision']): raise ValueError('Manifest requires a PASS gate for the current candidate revision')
        evidence = [item for item in self.repository.list_evidence(project_id) if item['status'] == 'ACTIVE']
        payload = {'schema_version': self.MANIFEST_SCHEMA, 'status': 'NOT_PUBLISHED', 'project_id': project['id'], 'candidate': {'id': candidate['id'], 'title': candidate['title'], 'summary': candidate['summary'], 'revision': candidate['revision'], 'fingerprint': candidate['fingerprint']}, 'gate_evaluation': {'id': gate['id'], 'outcome': gate['outcome'], 'input_fingerprint': gate['input_fingerprint']}, 'evidence': [{'id': item['id'], 'provenance': item['provenance'], 'reference_kind': item['reference_kind'], 'reference_value': item['reference_value']} for item in evidence]}
        canonical = json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=True)
        values = {'candidate_id': candidate_id, 'gate_evaluation_id': gate_evaluation_id, 'schema_version': self.MANIFEST_SCHEMA, 'fingerprint': hashlib.sha256(canonical.encode()).hexdigest(), 'status': 'NOT_PUBLISHED', 'payload_json': canonical, 'markdown': f"# {candidate['title']}\n\nStatus: NOT_PUBLISHED\n\nThis manifest records a frozen candidate and PASS gate; it is not a publication or deployment."}
        return self.repository.save_manifest(values)

    def manifest_get(self, workspace_id: str, project_id: str, candidate_id: str, manifest_id: str | None = None) -> dict[str, Any]:
        self.candidate_get(workspace_id, project_id, candidate_id)
        item = self.repository.get_manifest(candidate_id, manifest_id)
        if item is None: raise LookupError('Release manifest not found')
        return item
