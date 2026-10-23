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
