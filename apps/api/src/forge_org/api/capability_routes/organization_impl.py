# ruff: noqa: B008
"""Organization HTTP capability routes."""

from typing import Any

from fastapi import APIRouter, Depends, Query, status

from forge_org.api.dependencies import service
from forge_org.api.schemas import (
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    WorkspaceCreate,
    WorkspaceResponse,
    WorkspaceUpdate,
)
from forge_org.application.organization import (
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
    return organization.create_workspace(payload.name, payload.description)


@organization_router.get('/workspaces/{workspace_id}', response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: str, organization: OrganizationService = Depends(service)
) -> dict[str, Any]:
    return organization.workspace(workspace_id)


@organization_router.delete('/workspaces/{workspace_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: str, organization: OrganizationService = Depends(service)
) -> None:
    organization.delete_workspace(workspace_id)


@organization_router.patch('/workspaces/{workspace_id}', response_model=WorkspaceResponse)
def update_workspace(
    workspace_id: str,
    payload: WorkspaceUpdate,
    organization: OrganizationService = Depends(service),
) -> dict[str, Any]:
    return organization.update_workspace(workspace_id, payload.model_dump(exclude_unset=True))


@organization_router.post('/workspaces/{workspace_id}/archive', response_model=WorkspaceResponse)
def archive_workspace(
    workspace_id: str, organization: OrganizationService = Depends(service)
) -> dict[str, Any]:
    return organization.set_workspace_status(workspace_id, True)


@organization_router.post('/workspaces/{workspace_id}/restore', response_model=WorkspaceResponse)
def restore_workspace(
    workspace_id: str, organization: OrganizationService = Depends(service)
) -> dict[str, Any]:
    return organization.set_workspace_status(workspace_id, False)


@organization_router.get(
    '/workspaces/{workspace_id}/projects', response_model=list[ProjectResponse]
)
def list_projects(
    workspace_id: str,
    search: str | None = Query(default=None, max_length=120),
    status_filter: str = Query(default='active', alias='status'),
    organization: OrganizationService = Depends(service),
) -> list[dict[str, Any]]:
    return organization.projects(workspace_id, search, status_filter)


@organization_router.post(
    '/workspaces/{workspace_id}/projects',
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    workspace_id: str, payload: ProjectCreate, organization: OrganizationService = Depends(service)
) -> dict[str, Any]:
    return organization.create_project(workspace_id, payload.name, payload.description)


@organization_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}', response_model=ProjectResponse
)
def get_project(
    workspace_id: str, project_id: str, organization: OrganizationService = Depends(service)
) -> dict[str, Any]:
    return organization.project(workspace_id, project_id)


@organization_router.patch(
    '/workspaces/{workspace_id}/projects/{project_id}', response_model=ProjectResponse
)
def update_project(
    workspace_id: str,
    project_id: str,
    payload: ProjectUpdate,
    organization: OrganizationService = Depends(service),
) -> dict[str, Any]:
    return organization.update_project(
        workspace_id, project_id, payload.model_dump(exclude_unset=True)
    )


@organization_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/archive', response_model=ProjectResponse
)
def archive_project(
    workspace_id: str, project_id: str, organization: OrganizationService = Depends(service)
) -> dict[str, Any]:
    return organization.set_project_status(workspace_id, project_id, 'archived')


@organization_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/restore', response_model=ProjectResponse
)
def restore_project(
    workspace_id: str, project_id: str, organization: OrganizationService = Depends(service)
) -> dict[str, Any]:
    return organization.set_project_status(workspace_id, project_id, 'active')


def build_router(_source: APIRouter | None = None) -> APIRouter:
    """Return the concrete organization router; source is a compatibility argument."""
    return organization_router
