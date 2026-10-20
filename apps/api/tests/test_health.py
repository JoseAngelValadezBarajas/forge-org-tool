from fastapi.testclient import TestClient

from forge_org.main import create_app


def test_health_is_explicitly_bootstrap_only() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {
        "service": "forge-org-api",
        "status": "ok",
        "scope": "bootstrap-only",
    }


def test_future_business_api_does_not_exist() -> None:
    with TestClient(create_app()) as client:
        response = client.post("/api/v1/workspaces", json={"name": "Demo"})
    assert response.status_code == 404
