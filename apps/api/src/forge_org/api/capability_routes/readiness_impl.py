# ruff: noqa: B008
"""readiness HTTP capability routes."""

from typing import Any

from fastapi import APIRouter, Depends

from forge_org.api.dependencies import readiness_service, service_error
from forge_org.application.organization import InvalidInput, NotFound
from forge_org.application.readiness import ReadinessService

capability_router = APIRouter(prefix='/api/v1', tags=['organization'])


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/readiness/preview'
)
def preview_readiness(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    readiness: ReadinessService = Depends(readiness_service),
) -> dict[str, Any]:
    try:
        return readiness.evaluate(workspace_id, project_id, feature_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/readiness/evaluations',
    status_code=201,
)
def save_readiness(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    readiness: ReadinessService = Depends(readiness_service),
) -> dict[str, Any]:
    try:
        saved = readiness.save(workspace_id, project_id, feature_id)
        return {**saved, 'evaluation_id': saved['id'], 'stale': False}
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/readiness/evaluations'
)
def list_readiness(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    readiness: ReadinessService = Depends(readiness_service),
) -> list[dict[str, Any]]:
    try:
        return readiness.history(workspace_id, project_id, feature_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
