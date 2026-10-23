# ruff: noqa: B008
"""delivery HTTP capability routes."""

from typing import Any

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import PlainTextResponse

from forge_org.api.dependencies import delivery_service, service_error
from forge_org.api.schemas import (
    CandidateCreate,
    CandidateFreezeRequest,
    CandidateHistoryResponse,
    CandidateResponse,
    CandidateUpdate,
    EvidenceCreate,
    EvidenceResponse,
    GateEvaluationResponse,
    ManifestResponse,
    ManifestSaveRequest,
    VerificationRequest,
    VerificationResponse,
    VerificationRuleResponse,
)
from forge_org.application.delivery import DeliveryService
from forge_org.application.organization import InvalidInput, NotFound

capability_router = APIRouter(prefix='/api/v1', tags=['organization'])


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/evidence',
    response_model=list[EvidenceResponse],
)
def list_evidence(
    workspace_id: str,
    project_id: str,
    search: str | None = Query(default=None, max_length=200),
    provenance: str | None = None,
    status_filter: str | None = Query(default=None, alias='status'),
    delivery: DeliveryService = Depends(delivery_service),
) -> list[dict[str, Any]]:
    try:
        return delivery.evidence_list(workspace_id, project_id, search, provenance, status_filter)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/evidence',
    response_model=EvidenceResponse,
    status_code=201,
)
def create_evidence(
    workspace_id: str,
    project_id: str,
    payload: EvidenceCreate,
    delivery: DeliveryService = Depends(delivery_service),
) -> dict[str, Any]:
    try:
        return delivery.evidence_create(workspace_id, project_id, payload.model_dump())
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/evidence/{evidence_id}/invalidate',
    response_model=EvidenceResponse,
)
def invalidate_evidence(
    workspace_id: str,
    project_id: str,
    evidence_id: str,
    delivery: DeliveryService = Depends(delivery_service),
) -> dict[str, Any]:
    try:
        return delivery.evidence_invalidate(workspace_id, project_id, evidence_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/evidence/{evidence_id}',
    response_model=EvidenceResponse,
)
def get_evidence(
    workspace_id: str,
    project_id: str,
    evidence_id: str,
    delivery: DeliveryService = Depends(delivery_service),
) -> dict[str, Any]:
    try:
        return delivery.evidence_get(workspace_id, project_id, evidence_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/verifications/rules',
    response_model=list[VerificationRuleResponse],
)
def list_verification_rules(
    workspace_id: str, project_id: str, delivery: DeliveryService = Depends(delivery_service)
) -> list[dict[str, str]]:
    try:
        return delivery.verification_rules(workspace_id, project_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/verifications',
    response_model=list[VerificationResponse],
)
def list_verifications(
    workspace_id: str, project_id: str, delivery: DeliveryService = Depends(delivery_service)
) -> list[dict[str, Any]]:
    try:
        return delivery.verification_list(workspace_id, project_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/verifications/preview',
    response_model=VerificationResponse,
)
def preview_verification(
    workspace_id: str,
    project_id: str,
    payload: VerificationRequest,
    delivery: DeliveryService = Depends(delivery_service),
) -> dict[str, Any]:
    try:
        return delivery.verification_preview(
            workspace_id, project_id, payload.rule_id, payload.candidate_id
        )
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/verifications/evaluate',
    response_model=VerificationResponse,
    status_code=201,
)
def evaluate_verification(
    workspace_id: str,
    project_id: str,
    payload: VerificationRequest,
    delivery: DeliveryService = Depends(delivery_service),
) -> dict[str, Any]:
    try:
        return delivery.verification_evaluate(
            workspace_id, project_id, payload.rule_id, payload.candidate_id
        )
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/verifications/{evaluation_id}',
    response_model=VerificationResponse,
)
def get_verification(
    workspace_id: str,
    project_id: str,
    evaluation_id: str,
    delivery: DeliveryService = Depends(delivery_service),
) -> dict[str, Any]:
    try:
        return delivery.verification_get(workspace_id, project_id, evaluation_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/release-candidates',
    response_model=list[CandidateResponse],
)
def list_candidates(
    workspace_id: str, project_id: str, delivery: DeliveryService = Depends(delivery_service)
) -> list[dict[str, Any]]:
    try:
        return delivery.candidates(workspace_id, project_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/release-candidates',
    response_model=CandidateResponse,
    status_code=201,
)
def create_candidate(
    workspace_id: str,
    project_id: str,
    payload: CandidateCreate,
    delivery: DeliveryService = Depends(delivery_service),
) -> dict[str, Any]:
    try:
        return delivery.candidate_create(workspace_id, project_id, payload.model_dump())
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}',
    response_model=CandidateResponse,
)
def get_candidate(
    workspace_id: str,
    project_id: str,
    candidate_id: str,
    delivery: DeliveryService = Depends(delivery_service),
) -> dict[str, Any]:
    try:
        return delivery.candidate_get(workspace_id, project_id, candidate_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.patch(
    '/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}',
    response_model=CandidateResponse,
)
def update_candidate(
    workspace_id: str,
    project_id: str,
    candidate_id: str,
    payload: CandidateUpdate,
    delivery: DeliveryService = Depends(delivery_service),
) -> dict[str, Any]:
    try:
        return delivery.candidate_update(
            workspace_id, project_id, candidate_id, payload.model_dump(exclude_unset=True)
        )
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}/freeze',
    response_model=CandidateResponse,
)
def freeze_candidate(
    workspace_id: str,
    project_id: str,
    candidate_id: str,
    payload: CandidateFreezeRequest,
    delivery: DeliveryService = Depends(delivery_service),
) -> dict[str, Any]:
    try:
        return delivery.freeze(workspace_id, project_id, candidate_id, payload.expected_revision)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}/gates/preview',
    response_model=GateEvaluationResponse,
)
def preview_gates(
    workspace_id: str,
    project_id: str,
    candidate_id: str,
    delivery: DeliveryService = Depends(delivery_service),
) -> dict[str, Any]:
    try:
        return delivery.gate(workspace_id, project_id, candidate_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}/revisions',
    response_model=list[CandidateHistoryResponse],
)
def list_candidate_revisions(
    workspace_id: str,
    project_id: str,
    candidate_id: str,
    delivery: DeliveryService = Depends(delivery_service),
) -> list[dict[str, Any]]:
    try:
        return delivery.candidate_history(workspace_id, project_id, candidate_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}/gates',
    response_model=list[GateEvaluationResponse],
)
def list_candidate_gates(
    workspace_id: str,
    project_id: str,
    candidate_id: str,
    delivery: DeliveryService = Depends(delivery_service),
) -> list[dict[str, Any]]:
    try:
        return delivery.candidate_gate_history(workspace_id, project_id, candidate_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}/manifest',
    response_model=ManifestResponse,
)
def get_manifest(
    workspace_id: str,
    project_id: str,
    candidate_id: str,
    manifest_id: str | None = Query(default=None),
    delivery: DeliveryService = Depends(delivery_service),
) -> dict[str, Any]:
    try:
        return delivery.manifest_get(workspace_id, project_id, candidate_id, manifest_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}/manifest',
    response_model=ManifestResponse,
    status_code=201,
)
def save_manifest(
    workspace_id: str,
    project_id: str,
    candidate_id: str,
    payload: ManifestSaveRequest,
    delivery: DeliveryService = Depends(delivery_service),
) -> dict[str, Any]:
    try:
        return delivery.manifest_save(
            workspace_id, project_id, candidate_id, payload.gate_evaluation_id
        )
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}/manifest/download'
)
def download_manifest(
    workspace_id: str,
    project_id: str,
    candidate_id: str,
    format: str = Query(default='json'),
    manifest_id: str | None = Query(default=None),
    delivery: DeliveryService = Depends(delivery_service),
) -> Response:
    if format not in {'json', 'markdown'}:
        raise service_error(InvalidInput('Format must be json or markdown'))
    try:
        item = delivery.manifest_get(workspace_id, project_id, candidate_id, manifest_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    if format == 'markdown':
        return PlainTextResponse(item['markdown'], media_type='text/markdown')
    return Response(content=item['payload_json'], media_type='application/json')


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}/gates/evaluate',
    response_model=GateEvaluationResponse,
    status_code=201,
)
def evaluate_gates(
    workspace_id: str,
    project_id: str,
    candidate_id: str,
    delivery: DeliveryService = Depends(delivery_service),
) -> dict[str, Any]:
    try:
        return delivery.gate(workspace_id, project_id, candidate_id, save=True)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
