# ruff: noqa: B008
"""workbench HTTP capability routes."""

from typing import Any

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import PlainTextResponse

from forge_org.api.dependencies import handoff_service, run_service, service_error
from forge_org.api.schemas import (
    HandoffAcknowledgementResponse,
    HandoffAckRequest,
    HandoffCreate,
    HandoffResponse,
    HandoffRevisionResponse,
    HandoffUpdate,
    HandoffVersionRequest,
    RunCreate,
    RunEventCreate,
    RunEventResponse,
    RunResponse,
    RunStatusUpdate,
)
from forge_org.application.organization import InvalidInput, NotFound
from forge_org.application.runs import HandoffService, RunService

capability_router = APIRouter(prefix='/api/v1', tags=['organization'])


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/runs', response_model=list[RunResponse]
)
def list_runs(
    workspace_id: str,
    project_id: str,
    feature_id: str | None = None,
    status_filter: str | None = Query(default=None, alias='status'),
    search: str | None = Query(default=None, max_length=160),
    runs: RunService = Depends(run_service),
) -> list[dict[str, Any]]:
    try:
        return runs.list_runs(workspace_id, project_id, feature_id, status_filter, search)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/runs',
    response_model=RunResponse,
    status_code=201,
)
def create_run(
    workspace_id: str, project_id: str, payload: RunCreate, runs: RunService = Depends(run_service)
) -> dict[str, Any]:
    try:
        return runs.create(workspace_id, project_id, payload.model_dump())
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/runs/{run_id}', response_model=RunResponse
)
def get_run(
    workspace_id: str, project_id: str, run_id: str, runs: RunService = Depends(run_service)
) -> dict[str, Any]:
    try:
        return runs.get(workspace_id, project_id, run_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/runs/{run_id}/status',
    response_model=RunResponse,
)
def update_run_status(
    workspace_id: str,
    project_id: str,
    run_id: str,
    payload: RunStatusUpdate,
    runs: RunService = Depends(run_service),
) -> dict[str, Any]:
    try:
        return runs.change_status(
            workspace_id, project_id, run_id, payload.status, payload.expected_version
        )
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc
    except RuntimeError as exc:
        raise service_error(exc) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/runs/{run_id}/events',
    response_model=list[RunEventResponse],
)
def list_run_events(
    workspace_id: str, project_id: str, run_id: str, runs: RunService = Depends(run_service)
) -> list[dict[str, Any]]:
    try:
        return runs.events(workspace_id, project_id, run_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/runs/{run_id}/events',
    response_model=RunEventResponse,
    status_code=201,
)
def create_run_event(
    workspace_id: str,
    project_id: str,
    run_id: str,
    payload: RunEventCreate,
    runs: RunService = Depends(run_service),
) -> dict[str, Any]:
    try:
        return runs.add_event(workspace_id, project_id, run_id, payload.model_dump())
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc
    except RuntimeError as exc:
        raise service_error(exc) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/runs/{run_id}/handoffs',
    response_model=HandoffResponse,
    status_code=201,
)
def create_handoff(
    workspace_id: str,
    project_id: str,
    run_id: str,
    payload: HandoffCreate,
    handoffs: HandoffService = Depends(handoff_service),
) -> dict[str, Any]:
    try:
        return handoffs.create(workspace_id, project_id, {**payload.model_dump(), 'run_id': run_id})
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/handoffs',
    response_model=list[HandoffResponse],
)
def list_handoffs(
    workspace_id: str, project_id: str, handoffs: HandoffService = Depends(handoff_service)
) -> list[dict[str, Any]]:
    try:
        return handoffs.list_handoffs(workspace_id, project_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.patch(
    '/workspaces/{workspace_id}/projects/{project_id}/handoffs/{handoff_id}',
    response_model=HandoffResponse,
)
def update_handoff(
    workspace_id: str,
    project_id: str,
    handoff_id: str,
    payload: HandoffUpdate,
    handoffs: HandoffService = Depends(handoff_service),
) -> dict[str, Any]:
    try:
        return handoffs.update(
            workspace_id,
            project_id,
            handoff_id,
            payload.expected_version,
            payload.model_dump(exclude={'expected_version'}, exclude_unset=True),
        )
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc
    except RuntimeError as exc:
        raise service_error(exc) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/handoffs/{handoff_id}/ready',
    response_model=HandoffResponse,
)
def ready_handoff(
    workspace_id: str,
    project_id: str,
    handoff_id: str,
    payload: HandoffVersionRequest,
    handoffs: HandoffService = Depends(handoff_service),
) -> dict[str, Any]:
    try:
        return handoffs.ready(workspace_id, project_id, handoff_id, payload.expected_version)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc
    except RuntimeError as exc:
        raise service_error(exc) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/handoffs/{handoff_id}/acknowledge',
    response_model=HandoffAcknowledgementResponse,
)
def acknowledge_handoff(
    workspace_id: str,
    project_id: str,
    handoff_id: str,
    payload: HandoffAckRequest,
    handoffs: HandoffService = Depends(handoff_service),
) -> dict[str, Any]:
    try:
        return handoffs.acknowledge(
            workspace_id, project_id, handoff_id, payload.expected_revision, payload.acknowledged_by
        )
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc
    except RuntimeError as exc:
        raise service_error(exc) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/handoffs/{handoff_id}/revisions',
    response_model=list[HandoffRevisionResponse],
)
def list_handoff_revisions(
    workspace_id: str,
    project_id: str,
    handoff_id: str,
    handoffs: HandoffService = Depends(handoff_service),
) -> list[dict[str, Any]]:
    try:
        return handoffs.revisions(workspace_id, project_id, handoff_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/handoffs/{handoff_id}/revisions/{revision}/download'
)
def download_handoff_revision(
    workspace_id: str,
    project_id: str,
    handoff_id: str,
    revision: int,
    format: str = Query(default='json'),
    handoffs: HandoffService = Depends(handoff_service),
) -> Response:
    if format not in {'json', 'markdown'}:
        raise service_error(InvalidInput('Format must be json or markdown'))
    try:
        item = handoffs.get_revision(workspace_id, project_id, handoff_id, revision)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    if format == 'markdown':
        return PlainTextResponse(item['markdown'], media_type='text/markdown')
    return Response(content=item['payload_json'], media_type='application/json')
