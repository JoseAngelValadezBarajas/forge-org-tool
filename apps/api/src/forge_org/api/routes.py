# ruff: noqa: B008
import sqlite3
from collections.abc import Iterator
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

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
from forge_org.infrastructure.sqlite import connect

router = APIRouter(prefix="/api/v1", tags=["organization"])


def database() -> Iterator[sqlite3.Connection]:
    connection = connect()
    try:
        yield connection
    finally:
        connection.close()


def service(connection: sqlite3.Connection = Depends(database)) -> OrganizationService:
    return OrganizationService(connection)


def service_error(exc: Exception) -> HTTPException:
    if isinstance(exc, NotFound):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, DuplicateName):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, InvalidInput):
        return HTTPException(status_code=422, detail=str(exc))
    return HTTPException(status_code=500, detail="Unexpected organization error")


@router.get("/workspaces", response_model=list[WorkspaceResponse])
def list_workspaces(organization: OrganizationService = Depends(service)) -> list[dict[str, Any]]:
    return organization.list_workspaces()


@router.post("/workspaces", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(payload: WorkspaceCreate, organization: OrganizationService = Depends(service)) -> dict[str, Any]:
    try:
        return organization.create_workspace(payload.name, payload.description)
    except (DuplicateName, InvalidInput) as exc:
        raise service_error(exc) from exc


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(workspace_id: str, organization: OrganizationService = Depends(service)) -> dict[str, Any]:
    try:
        return organization.workspace(workspace_id)
    except NotFound as exc:
        raise service_error(exc) from exc


@router.patch("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(workspace_id: str, payload: WorkspaceUpdate, organization: OrganizationService = Depends(service)) -> dict[str, Any]:
    try:
        return organization.update_workspace(workspace_id, payload.model_dump(exclude_unset=True))
    except (DuplicateName, InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc


@router.get("/workspaces/{workspace_id}/projects", response_model=list[ProjectResponse])
def list_projects(
    workspace_id: str,
    search: str | None = Query(default=None, max_length=120),
    status_filter: str = Query(default="active", alias="status"),
    organization: OrganizationService = Depends(service),
) -> list[dict[str, Any]]:
    try:
        return organization.projects(workspace_id, search, status_filter)
    except (InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc


@router.post("/workspaces/{workspace_id}/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(workspace_id: str, payload: ProjectCreate, organization: OrganizationService = Depends(service)) -> dict[str, Any]:
    try:
        return organization.create_project(workspace_id, payload.name, payload.description)
    except (DuplicateName, InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc


@router.get("/workspaces/{workspace_id}/projects/{project_id}", response_model=ProjectResponse)
def get_project(workspace_id: str, project_id: str, organization: OrganizationService = Depends(service)) -> dict[str, Any]:
    try:
        return organization.project(workspace_id, project_id)
    except NotFound as exc:
        raise service_error(exc) from exc


@router.patch("/workspaces/{workspace_id}/projects/{project_id}", response_model=ProjectResponse)
def update_project(workspace_id: str, project_id: str, payload: ProjectUpdate, organization: OrganizationService = Depends(service)) -> dict[str, Any]:
    try:
        return organization.update_project(workspace_id, project_id, payload.model_dump(exclude_unset=True))
    except (DuplicateName, InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc


@router.post("/workspaces/{workspace_id}/projects/{project_id}/archive", response_model=ProjectResponse)
def archive_project(workspace_id: str, project_id: str, organization: OrganizationService = Depends(service)) -> dict[str, Any]:
    try:
        return organization.set_project_status(workspace_id, project_id, "archived")
    except (InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc


@router.post("/workspaces/{workspace_id}/projects/{project_id}/restore", response_model=ProjectResponse)
def restore_project(workspace_id: str, project_id: str, organization: OrganizationService = Depends(service)) -> dict[str, Any]:
    try:
        return organization.set_project_status(workspace_id, project_id, "active")
    except (InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc
