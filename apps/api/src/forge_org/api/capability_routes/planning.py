"""planning capability router."""

from fastapi import APIRouter

from .planning_impl import capability_router

_HANDLERS = (
    'planning_overview',
    'list_epics',
    'create_epic',
    'update_epic',
    'list_features',
    'create_feature',
    'update_feature',
    'update_criterion',
    'list_tasks',
    'create_task',
    'update_task',
    'reorder_tasks',
    'list_dependencies',
    'create_dependency',
    'delete_dependency',
    'list_criteria',
    'create_criterion',
    'list_decisions',
    'create_decision',
    'update_decision',
    'decision_revisions',
    'accept_decision',
    'link_decision',
    'create_invariant',
    'list_invariants',
    'update_invariant',
    'invariant_revisions',
    'acknowledge_invariant',
)


def build_router(_source: APIRouter | None = None) -> APIRouter:
    return capability_router
