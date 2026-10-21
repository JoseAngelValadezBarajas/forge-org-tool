from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from forge_org.desktop_sidecar import create_sidecar_app


def test_sidecar_requires_the_per_launch_bearer_token(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv('FORGE_DATABASE_PATH', str(tmp_path / 'sidecar.db'))
    token = 'a' * 48
    with TestClient(create_sidecar_app(token)) as client:
        assert client.get('/api/v1/health').status_code == 401
        assert (
            client.get('/api/v1/health', headers={'Authorization': 'Bearer wrong'}).status_code
            == 401
        )
        response = client.get('/api/v1/health', headers={'Authorization': f'Bearer {token}'})
        assert response.status_code == 200
        assert response.json()['scope'] == 'organization-foundation'


def test_sidecar_rejects_weak_or_empty_tokens() -> None:
    with pytest.raises(ValueError, match='at least 32'):
        create_sidecar_app('short-token')
