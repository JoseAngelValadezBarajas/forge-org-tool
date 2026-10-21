from __future__ import annotations

from fastapi import APIRouter
from fastapi.testclient import TestClient

from forge_org.api import routes as legacy_routes
from forge_org.api.capability_routes import (
    context,
    delivery,
    organization,
    planning,
    readiness,
    repositories,
    transfer,
    workbench,
)
from forge_org.api.capability_routes.organization_impl import list_workspaces
from forge_org.api.routes import router as legacy_router


def _paths(router: APIRouter) -> set[str]:
    return {route.path for route in router.routes}


def test_capability_routers_partition_the_existing_http_surface() -> None:
    routers = {
        'planning': planning.build_router(legacy_router),
        'organization': organization.build_router(legacy_router),
        'readiness': readiness.build_router(legacy_router),
        'repositories': repositories.build_router(legacy_router),
        'context': context.build_router(legacy_router),
        'workbench': workbench.build_router(legacy_router),
        'delivery': delivery.build_router(legacy_router),
        'transfer': transfer.build_router(legacy_router),
    }

    all_paths = set().union(*(_paths(router) for router in routers.values()))
    assert _paths(routers['organization'])
    assert all_paths >= _paths(legacy_router)
    assert sum(len(_paths(router)) for router in routers.values()) == len(all_paths)
    assert list_workspaces.__module__.endswith('organization_impl')


def test_connection_exposes_migration_and_repository_boundaries() -> None:
    from forge_org.infrastructure.connection import connect
    from forge_org.infrastructure.migrations.runner import migrate
    from forge_org.infrastructure.persistence import OrganizationRepository

    assert callable(connect)
    assert callable(migrate)
    assert OrganizationRepository.__name__ == 'OrganizationRepository'


def test_remaining_capabilities_own_their_handler_implementations() -> None:
    capability_handlers = {
        'planning': planning._HANDLERS,
        'readiness': readiness._HANDLERS,
        'repositories': repositories._HANDLERS,
        'context': context._HANDLERS,
        'workbench': workbench._HANDLERS,
        'delivery': delivery._HANDLERS,
        'transfer': transfer._HANDLERS,
    }
    for handlers in capability_handlers.values():
        for handler_name in handlers:
            assert not hasattr(legacy_routes, handler_name)


def test_repository_facade_delegates_to_cohesive_persistence_mixins() -> None:
    from forge_org.infrastructure.persistence import OrganizationRepository

    assert OrganizationRepository.list_workspaces.__qualname__.startswith(
        'OrganizationPlanningPersistence.'
    )
    assert OrganizationRepository.list_repositories.__qualname__.startswith(
        'RepositoryContextPersistence.'
    )
    assert OrganizationRepository.list_runs.__qualname__.startswith('WorkbenchPersistence.')
    assert OrganizationRepository.list_evidence.__qualname__.startswith('DeliveryPersistence.')


def test_representative_http_status_and_openapi_metadata_are_preserved(
    tmp_path, monkeypatch
) -> None:
    from forge_org.main import create_app

    monkeypatch.setenv('FORGE_DATABASE_PATH', str(tmp_path / 'boundaries.db'))
    client = TestClient(create_app())
    response = client.post('/api/v1/workspaces', json={'name': 'Boundary workspace'})
    assert response.status_code == 201
    assert {'id', 'name', 'created_at', 'updated_at'} <= response.json().keys()
    assert client.post('/api/v1/workspaces', json={'name': 'Boundary workspace'}).status_code == 409
    assert client.post('/api/v1/workspaces', json={}).status_code == 422

    operation = create_app().openapi()['paths']['/api/v1/workspaces']['post']
    assert operation['responses']['201']['content']['application/json']['schema']['$ref'].endswith(
        '/WorkspaceResponse'
    )
    assert '422' in operation['responses']
