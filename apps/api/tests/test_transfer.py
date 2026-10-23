import base64
import io
import json
import os
import stat
import zipfile
from pathlib import Path

from fastapi.testclient import TestClient
from test_attachments import _png

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


def test_project_package_round_trips_bug_screenshots_and_rejects_traversal_atomically(
    tmp_path: Path,
) -> None:
    os.environ['FORGE_DATABASE_PATH'] = str(tmp_path / 'transfer-package.db')
    try:
        with TestClient(create_app()) as client:
            workspace = client.post('/api/v1/workspaces', json={'name': 'Source'}).json()
            project = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects', json={'name': 'With bug'}
            ).json()
            bug = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects/{project["id"]}/features',
                json={
                    'title': 'Crash',
                    'kind': 'bug',
                    'bug_severity': 'medium',
                    'actual_result': 'Screenshot missing',
                },
            ).json()
            attachment_url = (
                f'/api/v1/workspaces/{workspace["id"]}/projects/{project["id"]}'
                f'/features/{bug["id"]}/attachments'
            )
            image = _png()
            uploaded = client.post(
                attachment_url,
                json={
                    'file_name': 'startup.png',
                    'content_type': 'image/png',
                    'data_base64': base64.b64encode(image).decode('ascii'),
                },
            )
            assert uploaded.status_code == 201

            archive_response = client.get(
                f'/api/v1/workspaces/{workspace["id"]}/projects/{project["id"]}/export/package'
            )
            assert archive_response.status_code == 200, archive_response.text
            archive = archive_response.content
            with zipfile.ZipFile(io.BytesIO(archive)) as package:
                manifest = json.loads(package.read('manifest.json'))
                exported_bug = manifest['features'][0]
                assert exported_bug['kind'] == 'bug'
                asset = exported_bug['attachments'][0]
                assert package.read(asset['path']) == image
                assert asset['sha256'] == uploaded.json()['sha256']

            target = client.post('/api/v1/workspaces', json={'name': 'Target'}).json()
            preview_url = f'/api/v1/workspaces/{target["id"]}/projects/import/package/preview'
            payload = {'archive_base64': base64.b64encode(archive).decode('ascii')}
            preview = client.post(preview_url, json=payload)
            assert preview.status_code == 200, preview.text
            imported = client.post(
                f'/api/v1/workspaces/{target["id"]}/projects/import/package',
                json={**payload, 'expected_fingerprint': preview.json()['fingerprint']},
            )
            assert imported.status_code == 201, imported.text
            target_project_id = imported.json()['project_id']
            target_bug = client.get(
                f'/api/v1/workspaces/{target["id"]}/projects/{target_project_id}/features'
            ).json()[0]
            target_attachment_url = (
                f'/api/v1/workspaces/{target["id"]}/projects/{target_project_id}'
                f'/features/{target_bug["id"]}/attachments'
            )
            saved = client.get(target_attachment_url).json()
            assert len(saved) == 1
            content = client.get(target_attachment_url + f'/{saved[0]["id"]}/content')
            assert content.content == image

            bad = io.BytesIO()
            with zipfile.ZipFile(bad, 'w') as malicious:
                malicious.writestr('manifest.json', json.dumps(manifest))
                malicious.writestr('../outside.png', image)
            bad_payload = {'archive_base64': base64.b64encode(bad.getvalue()).decode('ascii')}
            projects_before = client.get(f'/api/v1/workspaces/{target["id"]}/projects').json()
            rejected = client.post(preview_url, json=bad_payload)
            assert rejected.status_code == 422
            assert (
                client.get(f'/api/v1/workspaces/{target["id"]}/projects').json() == projects_before
            )

            with zipfile.ZipFile(io.BytesIO(archive)) as source_package:
                tampered_manifest = json.loads(source_package.read('manifest.json'))
                tampered_manifest['features'][0]['attachments'][0]['sha256'] = '0' * 64
                asset_path = tampered_manifest['features'][0]['attachments'][0]['path']
                asset_bytes = source_package.read(asset_path)
            tampered = io.BytesIO()
            with zipfile.ZipFile(tampered, 'w') as package:
                package.writestr('manifest.json', json.dumps(tampered_manifest))
                package.writestr(asset_path, asset_bytes)
            checksum_rejected = client.post(
                preview_url,
                json={'archive_base64': base64.b64encode(tampered.getvalue()).decode('ascii')},
            )
            assert checksum_rejected.status_code == 422

            symlink = io.BytesIO()
            with zipfile.ZipFile(symlink, 'w') as package:
                package.writestr('manifest.json', json.dumps(manifest))
                link = zipfile.ZipInfo('attachments/link.png')
                link.create_system = 3
                link.external_attr = (stat.S_IFLNK | 0o777) << 16
                package.writestr(link, '../outside.png')
            symlink_rejected = client.post(
                preview_url,
                json={'archive_base64': base64.b64encode(symlink.getvalue()).decode('ascii')},
            )
            assert symlink_rejected.status_code == 422
            assert (
                client.get(f'/api/v1/workspaces/{target["id"]}/projects').json() == projects_before
            )
    finally:
        os.environ.pop('FORGE_DATABASE_PATH', None)
