from fastapi.testclient import TestClient

from forge_org.main import create_app


def test_health_reports_current_foundation_scope() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {
        "service": "forge-org-api",
        "status": "ok",
        "scope": "organization-foundation",
    }
