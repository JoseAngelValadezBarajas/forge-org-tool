from pathlib import Path

from fastapi.testclient import TestClient

from forge_org.main import app


def test_workspace_and_project_lifecycle_is_scoped_and_durable(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv('FORGE_DATABASE_PATH', str(tmp_path / 'forge.db'))

    with TestClient(app) as client:
        workspace = client.post('/api/v1/workspaces', json={'name': 'Research'})
        assert workspace.status_code == 201
        workspace_id = workspace.json()['id']

        duplicate = client.post('/api/v1/workspaces', json={'name': ' research '})
        assert duplicate.status_code == 409

        project = client.post(
            f'/api/v1/workspaces/{workspace_id}/projects',
            json={'name': 'Forge Core', 'description': 'Foundation'},
        )
        assert project.status_code == 201
        project_id = project.json()['id']

        assert (
            client.get(
                f'/api/v1/workspaces/{workspace_id}/projects', params={'search': 'foundation'}
            ).json()[0]['id']
            == project_id
        )
        assert (
            client.post(f'/api/v1/workspaces/{workspace_id}/projects/{project_id}/archive').json()[
                'status'
            ]
            == 'archived'
        )
        assert (
            client.get(
                f'/api/v1/workspaces/{workspace_id}/projects', params={'status': 'active'}
            ).json()
            == []
        )

        other = client.post('/api/v1/workspaces', json={'name': 'Other'}).json()
        allowed = client.post(
            f'/api/v1/workspaces/{other["id"]}/projects', json={'name': 'Forge Core'}
        )
        assert allowed.status_code == 201
        assert (
            client.get(f'/api/v1/workspaces/{other["id"]}/projects/{project_id}').status_code == 404
        )

    with TestClient(app) as client:
        assert client.get(f'/api/v1/workspaces/{workspace_id}').status_code == 200
        assert (
            client.get(
                f'/api/v1/workspaces/{workspace_id}/projects', params={'status': 'archived'}
            ).json()[0]['name']
            == 'Forge Core'
        )


def test_invalid_names_and_missing_resources_are_explicit(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv('FORGE_DATABASE_PATH', str(tmp_path / 'forge.db'))

    with TestClient(app) as client:
        assert client.post('/api/v1/workspaces', json={'name': ' '}).status_code == 422
        assert client.get('/api/v1/workspaces/missing').status_code == 404
        assert client.get('/api/v1/workspaces/missing/projects').status_code == 404


def test_workspace_archive_and_restore_preserve_projects_and_gate_writes(
    tmp_path: Path, monkeypatch
) -> None:
    monkeypatch.setenv('FORGE_DATABASE_PATH', str(tmp_path / 'forge.db'))

    with TestClient(app) as client:
        workspace = client.post('/api/v1/workspaces', json={'name': 'Archive me'}).json()
        workspace_id = workspace['id']
        project = client.post(
            f'/api/v1/workspaces/{workspace_id}/projects', json={'name': 'Keep my data'}
        ).json()

        archived = client.post(f'/api/v1/workspaces/{workspace_id}/archive')
        assert archived.status_code == 200
        assert archived.json()['archived_at'] is not None
        assert client.get('/api/v1/workspaces').json()[0]['id'] == workspace_id
        assert (
            client.post(
                f'/api/v1/workspaces/{workspace_id}/projects', json={'name': 'Blocked'}
            ).status_code
            == 422
        )
        assert (
            client.get(f'/api/v1/workspaces/{workspace_id}/projects/{project["id"]}').status_code
            == 200
        )

        restored = client.post(f'/api/v1/workspaces/{workspace_id}/restore')
        assert restored.status_code == 200
        assert restored.json()['archived_at'] is None
        assert (
            client.post(
                f'/api/v1/workspaces/{workspace_id}/projects', json={'name': 'Allowed again'}
            ).status_code
            == 201
        )
