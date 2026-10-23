"""context capability router."""

from fastapi import APIRouter

from .context_impl import capability_router

_HANDLERS = (
    'link_feature_repository',
    'list_feature_repositories',
    'unlink_feature_repository',
    'preview_context',
    'list_context_packages',
    'save_context_package',
    'get_context_package',
    'download_context_package',
)


def build_router(_source: APIRouter | None = None) -> APIRouter:
    return capability_router
