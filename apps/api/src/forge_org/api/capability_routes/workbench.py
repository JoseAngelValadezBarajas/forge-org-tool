"""workbench capability router."""

from fastapi import APIRouter

from .workbench_impl import capability_router

_HANDLERS = (
    'list_runs',
    'create_run',
    'get_run',
    'update_run_status',
    'list_run_events',
    'create_run_event',
    'create_handoff',
    'list_handoffs',
    'update_handoff',
    'ready_handoff',
    'acknowledge_handoff',
    'list_handoff_revisions',
    'download_handoff_revision',
)


def build_router(_source: APIRouter | None = None) -> APIRouter:
    return capability_router
