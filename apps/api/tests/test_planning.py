import os
from pathlib import Path

from fastapi.testclient import TestClient

from forge_org.main import create_app


def test_planning_hierarchy_supports_epic_feature_and_overview(tmp_path: Path) -> None:
    os.environ['FORGE_DATABASE_PATH'] = str(tmp_path / 'planning.db')
    try:
        with TestClient(create_app()) as client:
            workspace = client.post('/api/v1/workspaces', json={'name': 'Planning'}).json()
            project = client.post(f"/api/v1/workspaces/{workspace['id']}/projects", json={'name': 'Launch'}).json()
            root = f"/api/v1/workspaces/{workspace['id']}/projects/{project['id']}"
            epic = client.post(f'{root}/epics', json={'title': 'Release'}).json()
            feature = client.post(f'{root}/features', json={'title': 'Board', 'epic_id': epic['id'], 'priority': 'high'}).json()
            assert feature['epic_id'] == epic['id']
            overview = client.get(f'{root}/planning/overview')
            assert overview.status_code == 200
            assert overview.json()['epics'][0]['features'][0]['title'] == 'Board'
    finally:
        os.environ.pop('FORGE_DATABASE_PATH', None)
