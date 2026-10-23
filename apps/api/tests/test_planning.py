import os
from pathlib import Path

from fastapi.testclient import TestClient

from forge_org.main import create_app


def test_acceptance_criteria_edit_satisfy_reorder_and_delete(tmp_path: Path) -> None:
    os.environ['FORGE_DATABASE_PATH'] = str(tmp_path / 'criteria.db')
    try:
        with TestClient(create_app()) as client:
            workspace = client.post('/api/v1/workspaces', json={'name': 'Criteria'}).json()
            project = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects', json={'name': 'Board'}
            ).json()
            feature = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects/{project["id"]}/features',
                json={'title': 'Story'},
            ).json()
            root = (
                f'/api/v1/workspaces/{workspace["id"]}/projects/{project["id"]}'
                f'/features/{feature["id"]}/acceptance-criteria'
            )
            created = [
                client.post(root, json={'description': name}).json()
                for name in ('First', 'Second', 'Third')
            ]
            criterion_url = f'{root}/{created[1]["id"]}'
            updated = client.patch(
                criterion_url, json={'description': 'Updated second', 'satisfied': True}
            )
            assert updated.status_code == 200
            assert updated.json()['description'] == 'Updated second'
            assert updated.json()['satisfied'] is True
            reordered = client.post(
                f'{root}/reorder',
                json={'ids': [created[2]['id'], created[0]['id'], created[1]['id']]},
            )
            assert reordered.status_code == 200
            assert [item['id'] for item in reordered.json()] == [
                created[2]['id'],
                created[0]['id'],
                created[1]['id'],
            ]
            assert (
                client.post(f'{root}/reorder', json={'ids': [created[0]['id']]}).status_code == 422
            )
            assert client.delete(criterion_url).status_code == 204
            assert [item['id'] for item in client.get(root).json()] == [
                created[2]['id'],
                created[0]['id'],
            ]
    finally:
        os.environ.pop('FORGE_DATABASE_PATH', None)


def test_workspace_tags_can_be_created_renamed_colored_and_deleted_without_deleting_items(
    tmp_path: Path,
) -> None:
    os.environ['FORGE_DATABASE_PATH'] = str(tmp_path / 'workspace-tags.db')
    try:
        with TestClient(create_app()) as client:
            workspace = client.post('/api/v1/workspaces', json={'name': 'Tags'}).json()
            other_workspace = client.post('/api/v1/workspaces', json={'name': 'Other'}).json()
            project = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects', json={'name': 'Board'}
            ).json()
            tag_url = f'/api/v1/workspaces/{workspace["id"]}/tags'
            tag = client.post(tag_url, json={'name': 'Desktop', 'color': '#336699'})
            assert tag.status_code == 201
            duplicate = client.post(tag_url, json={'name': ' desktop '})
            assert duplicate.status_code == 409
            feature = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects/{project["id"]}/features',
                json={'title': 'Bug', 'kind': 'bug', 'tags': ['desktop']},
            ).json()
            updated = client.patch(
                f'{tag_url}/{tag.json()["id"]}',
                json={'name': 'Screenshots', 'color': '#884422'},
            )
            assert updated.status_code == 200
            assert updated.json()['id'] == tag.json()['id']
            assert updated.json()['color'] == '#884422'
            assert (
                feature['id']
                == client.get(
                    f'/api/v1/workspaces/{workspace["id"]}/projects/{project["id"]}/features'
                ).json()[0]['id']
            )
            assert client.get(
                f'/api/v1/workspaces/{workspace["id"]}/projects/{project["id"]}/features'
            ).json()[0]['tags'] == ['Screenshots']
            assert (
                client.patch(
                    f'/api/v1/workspaces/{other_workspace["id"]}/tags/{tag.json()["id"]}',
                    json={'name': 'Cross workspace'},
                ).status_code
                == 404
            )
            assert client.delete(f'{tag_url}/{tag.json()["id"]}').status_code == 204
            remaining = client.get(
                f'/api/v1/workspaces/{workspace["id"]}/projects/{project["id"]}/features'
            ).json()
            assert remaining[0]['id'] == feature['id']
            assert remaining[0]['tags'] == []
    finally:
        os.environ.pop('FORGE_DATABASE_PATH', None)


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


def test_epic_priority_and_structured_bug_fields_persist(tmp_path: Path) -> None:
    os.environ['FORGE_DATABASE_PATH'] = str(tmp_path / 'work-items.db')
    try:
        with TestClient(create_app()) as client:
            workspace = client.post('/api/v1/workspaces', json={'name': 'Work items'}).json()
            project = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects', json={'name': 'Core'}
            ).json()
            root = f'/api/v1/workspaces/{workspace["id"]}/projects/{project["id"]}'
            epic = client.post(
                f'{root}/epics',
                json={
                    'title': 'Reliability',
                    'priority': 'critical',
                    'tags': [' Growth ', 'growth', ' Platform '],
                },
            )
            assert epic.status_code == 201
            assert epic.json()['priority'] == 'critical'
            assert epic.json()['tags'] == ['Growth', 'Platform']

            bug = client.post(
                f'{root}/features',
                json={
                    'title': 'Data loss on restart',
                    'kind': 'bug',
                    'epic_id': epic.json()['id'],
                    'tags': ['Platform'],
                    'bug_severity': 'high',
                    'steps_to_reproduce': 'Create a project; restart the app.',
                    'expected_result': 'The project remains available.',
                    'actual_result': 'The project is missing.',
                    'notes': 'Reported after upgrading.',
                },
            )
            assert bug.status_code == 201
            assert bug.json()['kind'] == 'bug'
            assert bug.json()['tags'] == ['Platform']
            assert bug.json()['bug_severity'] == 'high'
            assert bug.json()['notes'] == 'Reported after upgrading.'
            listed = client.get(f'{root}/features').json()
            assert listed[0]['steps_to_reproduce'] == 'Create a project; restart the app.'
            updated = client.patch(
                f'{root}/features/{bug.json()["id"]}',
                json={
                    'bug_severity': 'critical',
                    'actual_result': 'Data was lost.',
                    'status': 'done',
                    'tags': ['Reliability'],
                    'notes': 'Confirmed after the restart.',
                },
            )
            assert updated.status_code == 200
            assert updated.json()['bug_severity'] == 'critical'
            assert updated.json()['actual_result'] == 'Data was lost.'
            assert updated.json()['tags'] == ['Reliability']
            assert updated.json()['notes'] == 'Confirmed after the restart.'
            epic_detail = client.get(f'{root}/planning/overview').json()['epics'][0]
            assert epic_detail['feature_count'] == 1
            assert epic_detail['completed_feature_count'] == 1
            assert epic_detail['progress'] == 100
            tag_library = client.get(f'/api/v1/workspaces/{workspace["id"]}/tags')
            assert tag_library.status_code == 200
            assert [item['name'] for item in tag_library.json()] == [
                'Growth',
                'Platform',
                'Reliability',
            ]

            other_workspace = client.post(
                '/api/v1/workspaces', json={'name': 'Other tag scope'}
            ).json()
            other_project = client.post(
                f'/api/v1/workspaces/{other_workspace["id"]}/projects', json={'name': 'Other'}
            ).json()
            other_root = (
                f'/api/v1/workspaces/{other_workspace["id"]}/projects/{other_project["id"]}'
            )
            other_feature = client.post(
                f'{other_root}/features', json={'title': 'Independent', 'tags': ['growth']}
            ).json()
            other_tags = client.get(f'/api/v1/workspaces/{other_workspace["id"]}/tags').json()
            assert [item['name'] for item in other_tags] == ['growth']
            assert other_tags[0]['id'] != tag_library.json()[0]['id']
            assert other_feature['tags'] == ['growth']
            invalid_tag = client.post(
                f'{other_root}/features',
                json={'title': 'Invalid tags', 'tags': ['x' * 41]},
            )
            assert invalid_tag.status_code == 422
            assert len(client.get(f'{other_root}/features').json()) == 1
    finally:
        os.environ.pop('FORGE_DATABASE_PATH', None)


def test_epic_status_contract_preserves_source_and_existing_values(tmp_path: Path) -> None:
    os.environ['FORGE_DATABASE_PATH'] = str(tmp_path / 'epic-status.db')
    try:
        with TestClient(create_app()) as client:
            workspace = client.post('/api/v1/workspaces', json={'name': 'Epic statuses'}).json()
            project = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects', json={'name': 'Launch'}
            ).json()
            root = f'/api/v1/workspaces/{workspace["id"]}/projects/{project["id"]}'
            epic = client.post(f'{root}/epics', json={'title': 'Release'}).json()
            assert epic['status'] == 'backlog'
            for status in ('backlog', 'ready', 'in_progress', 'verify', 'done'):
                updated = client.patch(f'{root}/epics/{epic["id"]}', json={'status': status})
                assert updated.status_code == 200, (status, updated.text)
                assert updated.json()['status'] == status
                assert (
                    client.get(f'{root}/planning/overview').json()['epics'][0]['status'] == status
                )
            unsupported = client.patch(f'{root}/epics/{epic["id"]}', json={'status': 'archived'})
            assert unsupported.status_code == 422
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
