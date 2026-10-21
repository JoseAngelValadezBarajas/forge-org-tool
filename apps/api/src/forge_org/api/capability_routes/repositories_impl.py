# ruff: noqa: B008
"""repositories HTTP capability routes."""

from typing import Any

from fastapi import APIRouter, Depends

from forge_org.api.dependencies import repository_service, service_error
from forge_org.api.schemas import ObservationResponse, RepositoryCreate, RepositoryResponse
from forge_org.application.organization import InvalidInput, NotFound
from forge_org.application.repositories import RepositoryService

capability_router = APIRouter(prefix='/api/v1', tags=['organization'])


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/repositories',
    response_model=list[RepositoryResponse],
)
def list_repositories(
    workspace_id: str,
    project_id: str,
    repositories: RepositoryService = Depends(repository_service),
) -> list[dict[str, Any]]:
    try:
        return repositories.repositories(workspace_id, project_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/repositories',
    response_model=RepositoryResponse,
    status_code=201,
)
def connect_repository(
    workspace_id: str,
    project_id: str,
    payload: RepositoryCreate,
    repositories: RepositoryService = Depends(repository_service),
) -> dict[str, Any]:
    try:
        return repositories.connect(workspace_id, project_id, payload.root_path)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/repositories/{repository_id}/observe',
    response_model=ObservationResponse,
    status_code=201,
)
def observe_repository(
    workspace_id: str,
    project_id: str,
    repository_id: str,
    repositories: RepositoryService = Depends(repository_service),
) -> dict[str, Any]:
    try:
        return repositories.observe(workspace_id, project_id, repository_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/repositories/{repository_id}/observations',
    response_model=list[ObservationResponse],
)
def list_observations(
    workspace_id: str,
    project_id: str,
    repository_id: str,
    repositories: RepositoryService = Depends(repository_service),
) -> list[dict[str, Any]]:
    try:
        return repositories.observations(workspace_id, project_id, repository_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/repositories/{repository_id}/disconnect',
    response_model=RepositoryResponse,
)
def disconnect_repository(
    workspace_id: str,
    project_id: str,
    repository_id: str,
    repositories: RepositoryService = Depends(repository_service),
) -> dict[str, Any]:
    try:
        return repositories.disconnect(workspace_id, project_id, repository_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
