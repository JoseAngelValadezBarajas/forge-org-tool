# ruff: noqa: B008
"""Bug screenshot API capability."""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from forge_org.api.dependencies import bug_attachment_service
from forge_org.api.schemas import BugAttachmentCreate, BugAttachmentResponse
from forge_org.application.attachments import BugAttachmentService

capability_router = APIRouter(prefix='/api/v1', tags=['planning'])


def build_router(_source: APIRouter | None = None) -> APIRouter:
    return capability_router


def _service_error(exc: Exception) -> HTTPException:
    if isinstance(exc, LookupError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, ValueError):
        return HTTPException(status_code=422, detail=str(exc))
    return HTTPException(status_code=500, detail='Unable to process Bug screenshot')


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/attachments',
    response_model=list[BugAttachmentResponse],
)
def list_bug_attachments(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    service: BugAttachmentService = Depends(bug_attachment_service),
) -> list[dict[str, object]]:
    try:
        return service.list(workspace_id, project_id, feature_id)
    except (LookupError, ValueError) as exc:
        raise _service_error(exc) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/attachments',
    response_model=BugAttachmentResponse,
    status_code=201,
)
def upload_bug_attachment(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    payload: BugAttachmentCreate,
    service: BugAttachmentService = Depends(bug_attachment_service),
) -> dict[str, object]:
    try:
        return service.add(
            workspace_id,
            project_id,
            feature_id,
            payload.file_name,
            payload.content_type,
            payload.data_base64,
        )
    except (LookupError, ValueError) as exc:
        raise _service_error(exc) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/attachments/{attachment_id}/content'
)
def get_bug_attachment_content(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    attachment_id: str,
    service: BugAttachmentService = Depends(bug_attachment_service),
) -> FileResponse:
    try:
        record, path = service.content(workspace_id, project_id, feature_id, attachment_id)
        return FileResponse(
            Path(path),
            media_type=str(record['content_type']),
            filename=str(record['file_name']),
            content_disposition_type='inline',
            headers={'X-Content-Type-Options': 'nosniff'},
        )
    except (LookupError, ValueError) as exc:
        raise _service_error(exc) from exc


@capability_router.delete(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/attachments/{attachment_id}',
    status_code=204,
)
def delete_bug_attachment(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    attachment_id: str,
    service: BugAttachmentService = Depends(bug_attachment_service),
) -> None:
    try:
        service.remove(workspace_id, project_id, feature_id, attachment_id)
    except (LookupError, ValueError) as exc:
        raise _service_error(exc) from exc
