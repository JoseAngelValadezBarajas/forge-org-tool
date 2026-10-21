import json
import os
import subprocess
from pathlib import Path

from fastapi.testclient import TestClient

from forge_org.main import create_app


def test_repository_connection_is_allowlisted_and_observations_are_metadata_only(
    tmp_path: Path,
) -> None:
    database = tmp_path / 'repositories.db'
    repo_root = tmp_path / 'repo'
    repo_root.mkdir()
    subprocess.run(['git', 'init', str(repo_root)], check=True, capture_output=True)
    os.environ['FORGE_DATABASE_PATH'] = str(database)
    os.environ['FORGE_ALLOWED_REPOSITORY_ROOTS'] = json.dumps([str(tmp_path)])
    try:
        with TestClient(create_app()) as client:
            workspace = client.post('/api/v1/workspaces', json={'name': 'Repositories'}).json()
            project = client.post(
                f'/api/v1/workspaces/{workspace["id"]}/projects', json={'name': 'Context'}
            ).json()
            root = f'/api/v1/workspaces/{workspace["id"]}/projects/{project["id"]}'
            connected = client.post(f'{root}/repositories', json={'root_path': str(repo_root)})
            assert connected.status_code == 201
            repository = connected.json()
            observation = client.post(f'{root}/repositories/{repository["id"]}/observe')
            assert observation.status_code == 201
            assert observation.json()['unborn'] is True
            assert observation.json()['source_content_read'] is False
            assert client.post(f'{root}/repositories/{repository["id"]}/observe').status_code == 201
            outside = tmp_path / 'outside'
            outside.mkdir()
            rejected = client.post(f'{root}/repositories', json={'root_path': str(outside)})
            assert rejected.status_code == 422
            feature = client.post(
                f'{root}/features', json={'title': 'Context feature', 'goal': 'Review context'}
            ).json()
            linked = client.post(
                f'{root}/features/{feature["id"]}/repositories',
                json={'repository_id': repository['id']},
            )
            assert linked.status_code == 201
            preview = client.post(f'{root}/features/{feature["id"]}/context/preview')
            assert (
                preview.status_code == 200
                and preview.json()['schema_version'] == 'forge-context-v1'
            )
            saved = client.post(f'{root}/features/{feature["id"]}/context/packages')
            duplicate = client.post(f'{root}/features/{feature["id"]}/context/packages')
            assert saved.status_code == 201 and duplicate.json()['id'] == saved.json()['id']
            package_id = saved.json()['id']
            fetched = client.get(f'{root}/features/{feature["id"]}/context/packages/{package_id}')
            assert (
                fetched.status_code == 200
                and fetched.json()['fingerprint'] == saved.json()['fingerprint']
            )
            downloaded = client.get(
                f'{root}/features/{feature["id"]}/context/packages/{package_id}/download?format=markdown'
            )
            assert downloaded.status_code == 200 and downloaded.headers['content-type'].startswith(
                'text/markdown'
            )
            assert (
                client.delete(
                    f'{root}/features/{feature["id"]}/repositories/{repository["id"]}'
                ).status_code
                == 204
            )
            assert client.get(f'{root}/features/{feature["id"]}/repositories').json() == []
    finally:
        os.environ.pop('FORGE_DATABASE_PATH', None)
        os.environ.pop('FORGE_ALLOWED_REPOSITORY_ROOTS', None)
