"""planning capability router."""

from fastapi import APIRouter

from .planning_impl import capability_router

_HANDLERS = (
    'planning_overview',
    'list_workspace_tags',
    'create_workspace_tag',
    'update_workspace_tag',
    'delete_workspace_tag',
    'list_epics',
    'create_epic',
    'update_epic',
    'list_features',
    'create_feature',
    'update_feature',
    'update_criterion',
    'delete_criterion',
    'reorder_criteria',
    'list_tasks',
    'create_task',
    'update_task',
    'reorder_tasks',
    'list_dependencies',
    'create_dependency',
    'delete_dependency',
    'list_criteria',
    'create_criterion',
)


def build_router(_source: APIRouter | None = None) -> APIRouter:
    return capability_router
