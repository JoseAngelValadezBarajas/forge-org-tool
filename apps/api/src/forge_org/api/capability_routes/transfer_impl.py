# ruff: noqa: B008
"""transfer HTTP capability routes."""

import sqlite3
from typing import Any

from fastapi import APIRouter, Depends, Query

from forge_org.api.dependencies import service_error, transfer_service
from forge_org.api.schemas import ImportCommitRequest, ImportPreviewResponse, ImportResponse
from forge_org.application.organization import DuplicateName, InvalidInput, NotFound
from forge_org.application.transfer import ProjectTransferService

capability_router = APIRouter(prefix='/api/v1', tags=['organization'])


@capability_router.post(
    '/workspaces/{workspace_id}/projects/import/preview', response_model=ImportPreviewResponse
)
def preview_import(
    workspace_id: str,
    payload: dict[str, Any],
    transfer: ProjectTransferService = Depends(transfer_service),
) -> dict[str, Any]:
    try:
        return transfer.preview(workspace_id, payload)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except (ValueError, TypeError) as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/import', response_model=ImportResponse, status_code=201
)
def import_project(
    workspace_id: str,
    payload: ImportCommitRequest,
    transfer: ProjectTransferService = Depends(transfer_service),
) -> dict[str, Any]:
    try:
        result = transfer.import_project(
            workspace_id, payload.document, payload.expected_fingerprint
        )
        return {'workspace_id': workspace_id, **result}
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except (ValueError, TypeError) as exc:
        raise service_error(InvalidInput(str(exc))) from exc
    except RuntimeError as exc:
        raise service_error(exc) from exc
    except sqlite3.IntegrityError as exc:
        raise service_error(DuplicateName('Project name already exists in this workspace')) from exc


@capability_router.get('/workspaces/{workspace_id}/projects/{project_id}/export')
def export_project(
    workspace_id: str,
    project_id: str,
    schema_version: str = Query(default='forge-project-import-v1'),
    transfer: ProjectTransferService = Depends(transfer_service),
) -> dict[str, Any]:
    try:
        return transfer.export_project(workspace_id, project_id, schema_version)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc
