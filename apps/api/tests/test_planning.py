import os
from pathlib import Path

from fastapi.testclient import TestClient

from forge_org.main import create_app


def test_planning_hierarchy_supports_epic_feature_and_overview(tmp_path: Path) -> None:
    os.environ['FORGE_DATABASE_PATH'] = str(tmp_path / 'planning.db')
    try:
        with TestClient(create_app()) as client:
            workspace = client.post('/api/v1/workspaces', json={'name': 'Planning'}).json()
            project = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects', json={'name': 'Launch'}
            ).json()
            root = f'/api/v1/workspaces/{workspace["id"]}/projects/{project["id"]}'
            epic = client.post(f'{root}/epics', json={'title': 'Release'}).json()
            feature = client.post(
                f'{root}/features',
                json={'title': 'Board', 'epic_id': epic['id'], 'priority': 'high'},
            ).json()
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
            project = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects', json={'name': 'Launch'}
            ).json()
            root = f'/api/v1/workspaces/{workspace["id"]}/projects/{project["id"]}'
            blocking = client.post(
                f'{root}/features', json={'title': 'Foundation', 'goal': 'Prepare'}
            ).json()
            blocked = client.post(
                f'{root}/features', json={'title': 'Delivery', 'goal': 'Ship'}
            ).json()
            task = client.post(
                f'{root}/features/{blocked["id"]}/tasks', json={'title': 'Write docs'}
            )
            assert task.status_code == 201
            criterion = client.post(
                f'{root}/features/{blocked["id"]}/acceptance-criteria',
                json={'description': 'Docs are visible'},
            ).json()
            updated = client.patch(
                f'{root}/features/{blocked["id"]}/acceptance-criteria/{criterion["id"]}',
                json={'satisfied': True},
            )
            assert updated.status_code == 200 and updated.json()['satisfied'] is True
            dependency = client.post(
                f'{root}/dependencies',
                json={'blocking_feature_id': blocking['id'], 'blocked_feature_id': blocked['id']},
            )
            assert dependency.status_code == 201
            assert (
                client.get(f'{root}/dependencies').json()[0]['blocking_feature_id']
                == blocking['id']
            )
            assert (
                client.delete(f'{root}/dependencies/{dependency.json()["id"]}').status_code == 204
            )
            assert client.get(f'{root}/dependencies').json() == []
    finally:
        os.environ.pop('FORGE_DATABASE_PATH', None)


def test_planning_records_support_manual_updates_and_reordering(tmp_path: Path) -> None:
    os.environ['FORGE_DATABASE_PATH'] = str(tmp_path / 'planning-updates.db')
    try:
        with TestClient(create_app()) as client:
            workspace = client.post('/api/v1/workspaces', json={'name': 'Planning updates'}).json()
            project = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects', json={'name': 'Launch'}
            ).json()
            root = f'/api/v1/workspaces/{workspace["id"]}/projects/{project["id"]}'
            epic = client.post(f'{root}/epics', json={'title': 'Initial'}).json()
            updated_epic = client.patch(
                f'{root}/epics/{epic["id"]}', json={'title': 'Updated'}
            ).json()
            assert updated_epic['title'] == 'Updated'
            feature = client.post(
                f'{root}/features', json={'title': 'Feature', 'epic_id': epic['id']}
            ).json()
            updated_feature = client.patch(
                f'{root}/features/{feature["id"]}',
                json={'status': 'in_progress', 'priority': 'high'},
            ).json()
            assert updated_feature['status'] == 'in_progress'
            task_one = client.post(
                f'{root}/features/{feature["id"]}/tasks', json={'title': 'One', 'position': 0}
            ).json()
            task_two = client.post(
                f'{root}/features/{feature["id"]}/tasks', json={'title': 'Two', 'position': 1}
            ).json()
            updated_task = client.patch(
                f'{root}/features/{feature["id"]}/tasks/{task_one["id"]}', json={'status': 'done'}
            ).json()
            assert updated_task['status'] == 'done'
            reordered = client.post(
                f'{root}/features/{feature["id"]}/tasks/reorder',
                json={'ids': [task_two['id'], task_one['id']]},
            ).json()
            assert [task['id'] for task in reordered] == [task_two['id'], task_one['id']]
            dependency = client.post(
                f'{root}/dependencies',
                json={'blocking_feature_id': feature['id'], 'blocked_feature_id': feature['id']},
            ).status_code
            assert dependency == 422
    finally:
        os.environ.pop('FORGE_DATABASE_PATH', None)
