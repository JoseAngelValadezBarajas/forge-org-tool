"""transfer capability router."""

from fastapi import APIRouter

from .transfer_impl import capability_router

_HANDLERS = (
    'preview_import',
    'import_project',
    'export_project',
)


def build_router(_source: APIRouter | None = None) -> APIRouter:
    return capability_router
