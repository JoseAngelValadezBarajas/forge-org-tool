import json
import os
from pathlib import Path

from fastapi.testclient import TestClient

from forge_org.main import create_app


def test_project_transfer_previews_fingerprints_and_imports_planning_only(tmp_path: Path) -> None:
    os.environ['FORGE_DATABASE_PATH'] = str(tmp_path / 'transfer.db')
    try:
        with TestClient(create_app()) as client:
            workspace = client.post('/api/v1/workspaces', json={'name': 'Transfer'}).json()
            document = {
                'schema_version': 'forge-project-import-v1',
                'project': {'name': 'Imported', 'description': 'Planning only'},
                'epics': [{'ref': 'epic:one', 'title': 'Foundation'}],
                'features': [
                    {
                        'ref': 'feature:one',
                        'title': 'Setup',
                        'goal': 'Prepare',
                        'epic_ref': 'epic:one',
                        'tasks': [{'ref': 'task:one', 'title': 'Document'}],
                        'acceptance_criteria': [{'ref': 'criterion:one', 'description': 'Visible'}],
                    }
                ],
                'dependencies': [],
            }
            preview = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects/import/preview', json=document
            )
            assert preview.status_code == 200
            fingerprint = preview.json()['fingerprint']
            imported = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects/import',
                json={'document': document, 'expected_fingerprint': fingerprint},
            )
            assert imported.status_code == 201
            duplicate = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects/import',
                json={'document': document, 'expected_fingerprint': fingerprint},
            )
            assert duplicate.status_code == 409
            assert duplicate.json()['detail'] == 'Project name already exists in this workspace'
            exported = client.get(
                f'/api/v1/workspaces/{workspace["id"]}/projects/{imported.json()["project_id"]}/export'
            )
            assert exported.status_code == 200
            assert json.loads(exported.text)['schema_version'] == 'forge-project-import-v1'
            stale = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects/import',
                json={'document': document, 'expected_fingerprint': '0' * 64},
            )
            assert stale.status_code == 409
            cyclic = {
                **document,
                'dependencies': [
                    {'blocking_feature_ref': 'feature:one', 'blocked_feature_ref': 'feature:one'}
                ],
            }
            assert (
                client.post(
                    f'/api/v1/workspaces/{workspace["id"]}/projects/import/preview', json=cyclic
                ).status_code
                == 422
            )
            too_many = {
                **document,
                'epics': [{'ref': f'epic:{index}', 'title': 'E'} for index in range(101)],
            }
            assert (
                client.post(
                    f'/api/v1/workspaces/{workspace["id"]}/projects/import/preview', json=too_many
                ).status_code
                == 422
            )
    finally:
        os.environ.pop('FORGE_DATABASE_PATH', None)


def test_project_transfer_v2_preserves_tags_notes_bug_fields_and_v1_compatibility(
    tmp_path: Path,
) -> None:
    os.environ['FORGE_DATABASE_PATH'] = str(tmp_path / 'transfer-v2.db')
    try:
        with TestClient(create_app()) as client:
            workspace = client.post('/api/v1/workspaces', json={'name': 'Destination'}).json()
            document = {
                'schema_version': 'forge-project-transfer-v2',
                'project': {'name': 'Issue tracker', 'description': 'Transfer v2'},
                'epics': [
                    {
                        'ref': 'epic:one',
                        'title': 'Stability',
                        'priority': 'high',
                        'tags': ['Platform'],
                    }
                ],
                'features': [
                    {
                        'ref': 'bug:one',
                        'title': 'Startup crash',
                        'kind': 'bug',
                        'epic_ref': 'epic:one',
                        'priority': 'critical',
                        'status': 'verify',
                        'bug_severity': 'high',
                        'steps_to_reproduce': 'Launch the app',
                        'expected_result': 'Home is visible',
                        'actual_result': 'The app exits',
                        'notes': 'Reported by QA\nOnly on clean profile',
                        'tags': ['Desktop', ' PLATFORM '],
                        'tasks': [{'ref': 'task:one', 'title': 'Capture trace'}],
                        'acceptance_criteria': [
                            {'ref': 'criterion:one', 'description': 'Keep the log'}
                        ],
                    }
                ],
                'dependencies': [],
            }
            root = f'/api/v1/workspaces/{workspace["id"]}/projects'
            preview = client.post(f'{root}/import/preview', json=document)
            assert preview.status_code == 200
            imported = client.post(
                f'{root}/import',
                json={'document': document, 'expected_fingerprint': preview.json()['fingerprint']},
            )
            assert imported.status_code == 201
            assert imported.json()['schema_version'] == 'forge-project-transfer-v2'
            project_id = imported.json()['project_id']
            exported = client.get(
                f'{root}/{project_id}/export?schema_version=forge-project-transfer-v2'
            )
            assert exported.status_code == 200
            round_trip = exported.json()
            assert round_trip['schema_version'] == document['schema_version']
            assert round_trip['epics'][0]['priority'] == 'high'
            assert round_trip['epics'][0]['tags'] == ['Platform']
            feature = round_trip['features'][0]
            assert feature['kind'] == 'bug'
            assert feature['bug_severity'] == 'high'
            assert feature['actual_result'] == 'The app exits'
            assert feature['notes'] == 'Reported by QA\nOnly on clean profile'
            assert feature['tags'] == ['Desktop', 'Platform']
            assert len(feature['tasks']) == 1
            assert len(feature['acceptance_criteria']) == 1

            other_workspace = client.post('/api/v1/workspaces', json={'name': 'Second'}).json()
            second_root = f'/api/v1/workspaces/{other_workspace["id"]}/projects'
            second_preview = client.post(f'{second_root}/import/preview', json=round_trip).json()
            second = client.post(
                f'{second_root}/import',
                json={
                    'document': round_trip,
                    'expected_fingerprint': second_preview['fingerprint'],
                },
            )
            assert second.status_code == 201
            second_tags = client.get(f'/api/v1/workspaces/{other_workspace["id"]}/tags').json()
            assert [tag['name'] for tag in second_tags] == ['Desktop', 'Platform']
    finally:
        os.environ.pop('FORGE_DATABASE_PATH', None)
