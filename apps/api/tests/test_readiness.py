import os
from pathlib import Path

from fastapi.testclient import TestClient

from forge_org.main import create_app


def test_revisioned_decisions_invariants_and_readiness_are_explicit(tmp_path: Path) -> None:
    os.environ['FORGE_DATABASE_PATH'] = str(tmp_path / 'fnd03.db')
    try:
        with TestClient(create_app()) as client:
            workspace = client.post('/api/v1/workspaces', json={'name': 'Readiness'}).json()
            project = client.post(f"/api/v1/workspaces/{workspace['id']}/projects", json={'name': 'Forge'}).json()
            root = f"/api/v1/workspaces/{workspace['id']}/projects/{project['id']}"
            feature = client.post(f'{root}/features', json={'title': 'Planning readiness', 'goal': 'Start safely'}).json()
            criterion = client.post(f"{root}/features/{feature['id']}/acceptance-criteria", json={'description': 'The gate is explained'} )
            assert criterion.status_code == 201
            decision = client.post(f'{root}/decisions', json={'title': 'Use local rules', 'context': 'Planning', 'decision': 'Use deterministic rules', 'rationale': 'Explainable'}).json()
            assert client.post(f"{root}/decisions/{decision['id']}/features/{feature['id']}").status_code == 204
            invariant = client.post(f'{root}/invariants', json={'title': 'No delivery claims', 'statement': 'Readiness is planning only', 'rationale': 'Truth states'}).json()
            blocked = client.post(f"{root}/features/{feature['id']}/readiness/preview").json()
            assert blocked['outcome'] == 'NOT_READY'
            assert {'R04', 'R05'} <= set(blocked['failed_checks'])
            assert client.post(f"{root}/decisions/{decision['id']}/accept").status_code == 200
            assert client.post(f"{root}/features/{feature['id']}/invariants/{invariant['id']}/acknowledge", json={'expected_revision': 1}).status_code == 200
            ready = client.post(f"{root}/features/{feature['id']}/readiness/preview").json()
            assert ready['outcome'] == 'READY_TO_START'
            saved = client.post(f"{root}/features/{feature['id']}/readiness/evaluations")
            assert saved.status_code == 201
            changed = client.patch(f"{root}/invariants/{invariant['id']}", json={'statement': 'Readiness never means delivery verified'})
            assert changed.json()['revision'] == 2
            history = client.get(f"{root}/features/{feature['id']}/readiness/evaluations").json()
            assert history[0]['stale'] is True
    finally:
        os.environ.pop('FORGE_DATABASE_PATH', None)
