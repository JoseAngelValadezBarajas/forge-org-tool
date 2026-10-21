"""readiness capability router."""

from fastapi import APIRouter

from .readiness_impl import capability_router

_HANDLERS = (
    'preview_readiness',
    'save_readiness',
    'list_readiness',
)


def build_router(_source: APIRouter | None = None) -> APIRouter:
    return capability_router
