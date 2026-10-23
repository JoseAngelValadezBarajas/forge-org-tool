"""delivery capability router."""

from fastapi import APIRouter

from .delivery_impl import capability_router

_HANDLERS = (
    'list_evidence',
    'create_evidence',
    'invalidate_evidence',
    'get_evidence',
    'list_verification_rules',
    'list_verifications',
    'preview_verification',
    'evaluate_verification',
    'get_verification',
    'list_candidates',
    'create_candidate',
    'get_candidate',
    'update_candidate',
    'freeze_candidate',
    'preview_gates',
    'list_candidate_revisions',
    'list_candidate_gates',
    'get_manifest',
    'save_manifest',
    'download_manifest',
    'evaluate_gates',
)


def build_router(_source: APIRouter | None = None) -> APIRouter:
    return capability_router
