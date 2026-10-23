# ruff: noqa: B008
"""transfer HTTP capability routes."""

import base64
import binascii
import sqlite3
from typing import Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from forge_org.api.dependencies import project_package_service, service_error, transfer_service
from forge_org.api.schemas import (
    ImportCommitRequest,
    ImportPreviewResponse,
    ImportResponse,
    ProjectPackageImportRequest,
    ProjectPackagePreviewRequest,
)
from forge_org.application.organization import DuplicateName, InvalidInput, NotFound
from forge_org.application.project_package import MAX_PACKAGE_BYTES, ProjectPackageService
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


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/transfer/{scope}/{destination_id}/preview',
    response_model=ImportPreviewResponse,
)
def preview_contextual_import(
    workspace_id: str,
    project_id: str,
    scope: str,
    destination_id: str,
    payload: dict[str, Any],
    transfer: ProjectTransferService = Depends(transfer_service),
) -> dict[str, Any]:
    try:
        return transfer.preview_contextual_import(
            workspace_id, project_id, scope, destination_id, payload
        )
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except (ValueError, TypeError) as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/transfer/{scope}/{destination_id}',
    response_model=ImportResponse,
    status_code=201,
)
def import_contextual(
    workspace_id: str,
    project_id: str,
    scope: str,
    destination_id: str,
    payload: ImportCommitRequest,
    transfer: ProjectTransferService = Depends(transfer_service),
) -> dict[str, Any]:
    try:
        return transfer.import_contextual(
            workspace_id,
            project_id,
            scope,
            destination_id,
            payload.document,
            payload.expected_fingerprint,
        )
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except (ValueError, TypeError) as exc:
        raise service_error(InvalidInput(str(exc))) from exc
    except RuntimeError as exc:
        raise service_error(exc) from exc
    except sqlite3.IntegrityError as exc:
        raise service_error(
            DuplicateName('Contextual import conflicts with existing records')
        ) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/transfer/{scope}/{destination_id}/export'
)
def export_contextual(
    workspace_id: str,
    project_id: str,
    scope: str,
    destination_id: str,
    transfer: ProjectTransferService = Depends(transfer_service),
) -> dict[str, Any]:
    try:
        return transfer.export_contextual(workspace_id, project_id, scope, destination_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


def _decode_package(encoded: str) -> bytes:
    try:
        package = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise service_error(InvalidInput('Project package is not valid base64')) from exc
    if not package or len(package) > MAX_PACKAGE_BYTES:
        raise service_error(InvalidInput('Project package must not exceed 5 MiB'))
    return package


@capability_router.get('/workspaces/{workspace_id}/projects/{project_id}/export/package')
def export_project_package(
    workspace_id: str,
    project_id: str,
    package: ProjectPackageService = Depends(project_package_service),
) -> Response:
    try:
        content = package.export(workspace_id, project_id)
        return Response(
            content,
            media_type='application/zip',
            headers={'Content-Disposition': 'attachment; filename="forge-project-transfer-v2.zip"'},
        )
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/import/package/preview',
    response_model=ImportPreviewResponse,
)
def preview_project_package(
    workspace_id: str,
    payload: ProjectPackagePreviewRequest,
    package: ProjectPackageService = Depends(project_package_service),
) -> dict[str, Any]:
    try:
        return package.preview(workspace_id, _decode_package(payload.archive_base64))
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except (ValueError, TypeError) as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/import/package',
    response_model=ImportResponse,
    status_code=201,
)
def import_project_package(
    workspace_id: str,
    payload: ProjectPackageImportRequest,
    package: ProjectPackageService = Depends(project_package_service),
) -> dict[str, Any]:
    try:
        return {
            'workspace_id': workspace_id,
            **package.import_project(
                workspace_id,
                _decode_package(payload.archive_base64),
                payload.expected_fingerprint,
            ),
        }
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except (ValueError, TypeError) as exc:
        raise service_error(InvalidInput(str(exc))) from exc
    except RuntimeError as exc:
        raise service_error(exc) from exc
    except sqlite3.IntegrityError as exc:
        raise service_error(DuplicateName('Project name already exists in this workspace')) from exc
