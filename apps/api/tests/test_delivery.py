import os
from pathlib import Path

from fastapi.testclient import TestClient

from forge_org.main import create_app


def test_delivery_keeps_reported_evidence_and_release_gates_explicit(tmp_path: Path) -> None:
    os.environ['FORGE_DATABASE_PATH'] = str(tmp_path / 'delivery.db')
    try:
        with TestClient(create_app()) as client:
            workspace = client.post('/api/v1/workspaces', json={'name': 'Delivery'}).json()
            project = client.post(f"/api/v1/workspaces/{workspace['id']}/projects", json={'name': 'Evidence'}).json()
            root = f"/api/v1/workspaces/{workspace['id']}/projects/{project['id']}"
            evidence = client.post(f'{root}/evidence', json={'title': 'Human report', 'summary': 'Reported manually', 'provenance': 'REPORTED', 'reference_kind': 'artifact', 'reference_value': 'report-1'}).json()
            assert evidence['status'] == 'ACTIVE' and evidence['provenance'] == 'REPORTED'
            assert client.get(f'{root}/evidence/{evidence["id"]}').json()['title'] == 'Human report'
            assert client.get(f'{root}/evidence?provenance=REPORTED').json()[0]['id'] == evidence['id']
            invalidated = client.post(f"{root}/evidence/{evidence['id']}/invalidate")
            assert invalidated.status_code == 200 and invalidated.json()['status'] == 'INVALIDATED'
            candidate = client.post(f'{root}/release-candidates', json={'title': 'Alpha candidate', 'summary': 'Candidate summary'}).json()
            frozen = client.post(f"{root}/release-candidates/{candidate['id']}/freeze", json={'expected_revision': candidate['revision']})
            assert frozen.status_code == 200 and frozen.json()['status'] == 'FROZEN'
            assert client.get(f"{root}/release-candidates/{candidate['id']}").json()['status'] == 'FROZEN'
            assert len(client.get(f"{root}/release-candidates/{candidate['id']}/revisions").json()) == 1
            gates = client.post(f"{root}/release-candidates/{candidate['id']}/gates/preview")
            assert gates.status_code == 200 and gates.json()['outcome'] == 'BLOCKED'
            evaluated = client.post(f"{root}/release-candidates/{candidate['id']}/gates/evaluate")
            assert evaluated.status_code == 201
            assert len(client.get(f"{root}/release-candidates/{candidate['id']}/gates").json()) == 1
            rules = client.get(f'{root}/verifications/rules')
            assert rules.status_code == 200 and any(rule['id'] == 'verified-evidence-present' for rule in rules.json())
            blocked_verification = client.post(f'{root}/verifications/preview', json={'rule_id': 'verified-evidence-present', 'candidate_id': candidate['id']})
            assert blocked_verification.status_code == 200 and blocked_verification.json()['outcome'] == 'BLOCKED'
            verified = client.post(f'{root}/evidence', json={'title': 'Verified artifact', 'summary': 'Reviewed artifact', 'provenance': 'VERIFIED', 'reference_kind': 'artifact', 'reference_value': 'artifact-1'}).json()
            passed_verification = client.post(f'{root}/verifications/evaluate', json={'rule_id': 'verified-evidence-present', 'candidate_id': candidate['id']})
            assert passed_verification.status_code == 201 and passed_verification.json()['outcome'] == 'PASS'
            assert len(client.get(f'{root}/verifications').json()) == 1
            passing_gate = client.post(f"{root}/release-candidates/{candidate['id']}/gates/evaluate")
            assert passing_gate.json()['outcome'] == 'PASS'
            manifest = client.post(f"{root}/release-candidates/{candidate['id']}/manifest", json={'gate_evaluation_id': passing_gate.json()['id']})
            assert manifest.status_code == 201 and manifest.json()['status'] == 'NOT_PUBLISHED'
            manifest_download = client.get(f"{root}/release-candidates/{candidate['id']}/manifest/download?format=json")
            assert manifest_download.status_code == 200 and manifest_download.headers['content-type'].startswith('application/json')
            client.post(f"{root}/evidence/{verified['id']}/invalidate")
            assert client.get(f"{root}/verifications/{passed_verification.json()['id']}").json()['stale'] is True
    finally:
        os.environ.pop('FORGE_DATABASE_PATH', None)
