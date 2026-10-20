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

def test_tasks_criteria_and_dependencies_are_project_scoped(tmp_path: Path) -> None:
    os.environ['FORGE_DATABASE_PATH'] = str(tmp_path / 'tasks.db')
    try:
        with TestClient(create_app()) as client:
            workspace = client.post('/api/v1/workspaces', json={'name': 'Planning 2'}).json()
            project = client.post(f"/api/v1/workspaces/{workspace['id']}/projects", json={'name': 'Launch'}).json()
            root = f"/api/v1/workspaces/{workspace['id']}/projects/{project['id']}"
            blocking = client.post(f'{root}/features', json={'title': 'Foundation', 'goal': 'Prepare'}).json()
            blocked = client.post(f'{root}/features', json={'title': 'Delivery', 'goal': 'Ship'}).json()
            task = client.post(f"{root}/features/{blocked['id']}/tasks", json={'title': 'Write docs'} )
            assert task.status_code == 201
            criterion = client.post(f"{root}/features/{blocked['id']}/acceptance-criteria", json={'description': 'Docs are visible'}).json()
            updated = client.patch(f"{root}/features/{blocked['id']}/acceptance-criteria/{criterion['id']}", json={'satisfied': True})
            assert updated.status_code == 200 and updated.json()['satisfied'] is True
            dependency = client.post(f'{root}/dependencies', json={'blocking_feature_id': blocking['id'], 'blocked_feature_id': blocked['id']})
            assert dependency.status_code == 201
            assert client.get(f'{root}/dependencies').json()[0]['blocking_feature_id'] == blocking['id']
    finally:
        os.environ.pop('FORGE_DATABASE_PATH', None)
