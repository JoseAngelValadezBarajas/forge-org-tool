import pytest
from fastapi.testclient import TestClient

from forge_org.main import create_app


def test_health_reports_current_foundation_scope() -> None:
    with TestClient(create_app()) as client:
        response = client.get('/api/v1/health')
    assert response.status_code == 200
    assert response.json() == {
        'service': 'forge-org-api',
        'status': 'ok',
        'scope': 'organization-foundation',
    }


def test_rejects_a_foreign_host_header() -> None:
    client = TestClient(create_app())
    assert client.get('/api/v1/health', headers={'Host': 'evil.example'}).status_code == 400
    assert client.get('/api/v1/health', headers={'Host': '127.0.0.1:8000'}).status_code == 200
    assert client.get('/api/v1/health', headers={'Host': 'localhost:5173'}).status_code == 200


def test_extra_hosts_come_from_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv('FORGE_ALLOWED_HOSTS', 'dev.internal, ')
    client = TestClient(create_app())
    assert client.get('/api/v1/health', headers={'Host': 'dev.internal'}).status_code == 200
