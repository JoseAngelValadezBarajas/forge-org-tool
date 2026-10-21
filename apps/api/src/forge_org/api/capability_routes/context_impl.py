# ruff: noqa: B008
"""context HTTP capability routes."""

import sqlite3
from typing import Any

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import PlainTextResponse

from forge_org.api.dependencies import context_service, repository_service, service_error
from forge_org.api.schemas import ContextPackageResponse, RepositoryLinkCreate, RepositoryResponse
from forge_org.application.context_packages import ContextPackageService
from forge_org.application.organization import DuplicateName, InvalidInput, NotFound
from forge_org.application.repositories import RepositoryService

capability_router = APIRouter(prefix='/api/v1', tags=['organization'])


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/repositories',
    status_code=201,
)
def link_feature_repository(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    payload: RepositoryLinkCreate,
    repositories: RepositoryService = Depends(repository_service),
) -> dict[str, Any]:
    try:
        return repositories.link_feature(
            workspace_id, project_id, feature_id, payload.repository_id
        )
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except sqlite3.IntegrityError as exc:
        raise service_error(DuplicateName('Repository already linked')) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/repositories',
    response_model=list[RepositoryResponse],
)
def list_feature_repositories(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    repositories: RepositoryService = Depends(repository_service),
) -> list[dict[str, Any]]:
    try:
        return repositories.feature_links(workspace_id, project_id, feature_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.delete(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/repositories/{repository_id}',
    status_code=204,
)
def unlink_feature_repository(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    repository_id: str,
    repositories: RepositoryService = Depends(repository_service),
) -> None:
    try:
        repositories.unlink_feature(workspace_id, project_id, feature_id, repository_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/context/preview'
)
def preview_context(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    context: ContextPackageService = Depends(context_service),
) -> dict[str, Any]:
    try:
        return context.preview(workspace_id, project_id, feature_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/context/packages',
    response_model=list[ContextPackageResponse],
)
def list_context_packages(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    context: ContextPackageService = Depends(context_service),
) -> list[dict[str, Any]]:
    try:
        return context.list(workspace_id, project_id, feature_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/context/packages',
    response_model=ContextPackageResponse,
    status_code=201,
)
def save_context_package(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    context: ContextPackageService = Depends(context_service),
) -> dict[str, Any]:
    try:
        return context.save(workspace_id, project_id, feature_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/context/packages/{package_id}',
    response_model=ContextPackageResponse,
)
def get_context_package(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    package_id: str,
    context: ContextPackageService = Depends(context_service),
) -> dict[str, Any]:
    try:
        return context.get(workspace_id, project_id, feature_id, package_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/context/packages/{package_id}/download'
)
def download_context_package(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    package_id: str,
    format: str = Query(default='json'),
    context: ContextPackageService = Depends(context_service),
) -> Response:
    if format not in {'json', 'markdown'}:
        raise service_error(InvalidInput('Format must be json or markdown'))
    try:
        package = context.get(workspace_id, project_id, feature_id, package_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    if format == 'markdown':
        return PlainTextResponse(package['markdown'], media_type='text/markdown')
    return Response(content=package['payload_json'], media_type='application/json')
