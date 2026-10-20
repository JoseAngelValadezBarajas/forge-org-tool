import os
from pathlib import Path

from fastapi.testclient import TestClient

from forge_org.main import create_app


def test_reported_run_lifecycle_and_immutable_handoff(tmp_path: Path) -> None:
    os.environ['FORGE_DATABASE_PATH'] = str(tmp_path / 'runs.db')
    try:
        with TestClient(create_app()) as client:
            workspace = client.post('/api/v1/workspaces', json={'name': 'Runs'}).json()
            project = client.post(f"/api/v1/workspaces/{workspace['id']}/projects", json={'name': 'Workbench'}).json()
            root = f"/api/v1/workspaces/{workspace['id']}/projects/{project['id']}"
            feature = client.post(f'{root}/features', json={'title': 'Reported work', 'goal': 'Record human work'}).json()
            run = client.post(f'{root}/runs', json={'feature_id': feature['id'], 'title': 'Manual report', 'execution_mode': 'manual', 'executor_type': 'human'}).json()
            assert run['status'] == 'PLANNED'
            assert client.get(f"{root}/runs/{run['id']}").json()['id'] == run['id']
            assert client.get(f'{root}/runs?status=PLANNED&search=Manual').json()[0]['id'] == run['id']
            started = client.post(f"{root}/runs/{run['id']}/status", json={'status': 'IN_PROGRESS', 'expected_version': 1})
            assert started.status_code == 200
            event = client.post(f"{root}/runs/{run['id']}/events", json={'event_type': 'progress', 'title': 'Work reported', 'description': 'A human reported progress', 'expected_version': 2})
            assert event.status_code == 201
            handoff = client.post(f"{root}/runs/{run['id']}/handoffs", json={'title': 'Next handoff'}).json()
            assert handoff['title'] == 'Next handoff'
            ready = client.post(f"{root}/handoffs/{handoff['id']}/ready", json={'expected_version': handoff['version']})
            assert ready.status_code == 422
            draft = client.patch(f"{root}/handoffs/{handoff['id']}", json={'expected_version': handoff['version'], 'title': 'Ready handoff', 'summary': 'Reported summary', 'next_actions': 'Review manually'}).json()
            published = client.post(f"{root}/handoffs/{handoff['id']}/ready", json={'expected_version': draft['version']}).json()
            assert published['status'] == 'READY' and published['current_revision'] == 1
            revisions = client.get(f"{root}/handoffs/{handoff['id']}/revisions")
            assert revisions.status_code == 200 and revisions.json()[0]['revision'] == 1
            download = client.get(f"{root}/handoffs/{handoff['id']}/revisions/1/download?format=markdown")
            assert download.status_code == 200 and download.headers['content-type'].startswith('text/markdown')
            acknowledged = client.post(f"{root}/handoffs/{handoff['id']}/acknowledge", json={'expected_revision': 1, 'acknowledged_by': 'reviewer'})
            assert acknowledged.status_code == 200
            stale = client.post(f"{root}/handoffs/{handoff['id']}/acknowledge", json={'expected_revision': 1, 'acknowledged_by': 'reviewer'})
            assert stale.status_code == 409
    finally:
        os.environ.pop('FORGE_DATABASE_PATH', None)
