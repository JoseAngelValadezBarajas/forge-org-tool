from fastapi import APIRouter

from .organization_impl import organization_router

_HANDLERS = (
    'list_workspaces',
    'create_workspace',
    'get_workspace',
    'update_workspace',
    'list_projects',
    'create_project',
    'get_project',
    'update_project',
    'archive_project',
    'restore_project',
)


def build_router(source: APIRouter | None = None) -> APIRouter:
    return organization_router
