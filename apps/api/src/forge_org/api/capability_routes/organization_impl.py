# ruff: noqa: B008
"""Organization HTTP capability routes."""

from typing import Any

from fastapi import APIRouter, Depends, Query, status

from forge_org.api.dependencies import service, service_error
from forge_org.api.schemas import (
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    WorkspaceCreate,
    WorkspaceResponse,
    WorkspaceUpdate,
)
from forge_org.application.organization import (
    DuplicateName,
    InvalidInput,
    NotFound,
    OrganizationService,
)

organization_router = APIRouter(prefix='/api/v1', tags=['organization'])


@organization_router.get('/workspaces', response_model=list[WorkspaceResponse])
def list_workspaces(organization: OrganizationService = Depends(service)) -> list[dict[str, Any]]:
    return organization.list_workspaces()


@organization_router.post(
    '/workspaces', response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED
)
def create_workspace(
    payload: WorkspaceCreate, organization: OrganizationService = Depends(service)
) -> dict[str, Any]:
    try:
        return organization.create_workspace(payload.name, payload.description)
    except (DuplicateName, InvalidInput) as exc:
        raise service_error(exc) from exc


@organization_router.get('/workspaces/{workspace_id}', response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: str, organization: OrganizationService = Depends(service)
) -> dict[str, Any]:
    try:
        return organization.workspace(workspace_id)
    except NotFound as exc:
        raise service_error(exc) from exc


@organization_router.patch('/workspaces/{workspace_id}', response_model=WorkspaceResponse)
def update_workspace(
    workspace_id: str,
    payload: WorkspaceUpdate,
    organization: OrganizationService = Depends(service),
) -> dict[str, Any]:
    try:
        return organization.update_workspace(workspace_id, payload.model_dump(exclude_unset=True))
    except (DuplicateName, InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc


@organization_router.get(
    '/workspaces/{workspace_id}/projects', response_model=list[ProjectResponse]
)
def list_projects(
    workspace_id: str,
    search: str | None = Query(default=None, max_length=120),
    status_filter: str = Query(default='active', alias='status'),
    organization: OrganizationService = Depends(service),
) -> list[dict[str, Any]]:
    try:
        return organization.projects(workspace_id, search, status_filter)
    except (InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc


@organization_router.post(
    '/workspaces/{workspace_id}/projects',
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    workspace_id: str, payload: ProjectCreate, organization: OrganizationService = Depends(service)
) -> dict[str, Any]:
    try:
        return organization.create_project(workspace_id, payload.name, payload.description)
    except (DuplicateName, InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc


@organization_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}', response_model=ProjectResponse
)
def get_project(
    workspace_id: str, project_id: str, organization: OrganizationService = Depends(service)
) -> dict[str, Any]:
    try:
        return organization.project(workspace_id, project_id)
    except NotFound as exc:
        raise service_error(exc) from exc


@organization_router.patch(
    '/workspaces/{workspace_id}/projects/{project_id}', response_model=ProjectResponse
)
def update_project(
    workspace_id: str,
    project_id: str,
    payload: ProjectUpdate,
    organization: OrganizationService = Depends(service),
) -> dict[str, Any]:
    try:
        return organization.update_project(
            workspace_id, project_id, payload.model_dump(exclude_unset=True)
        )
    except (DuplicateName, InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc


@organization_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/archive', response_model=ProjectResponse
)
def archive_project(
    workspace_id: str, project_id: str, organization: OrganizationService = Depends(service)
) -> dict[str, Any]:
    try:
        return organization.set_project_status(workspace_id, project_id, 'archived')
    except (InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc


@organization_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/restore', response_model=ProjectResponse
)
def restore_project(
    workspace_id: str, project_id: str, organization: OrganizationService = Depends(service)
) -> dict[str, Any]:
    try:
        return organization.set_project_status(workspace_id, project_id, 'active')
    except (InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc


def build_router(_source: APIRouter | None = None) -> APIRouter:
    """Return the concrete organization router; source is a compatibility argument."""
    return organization_router
