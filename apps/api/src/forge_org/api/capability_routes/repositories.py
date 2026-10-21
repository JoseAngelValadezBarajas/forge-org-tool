"""repositories capability router."""

from fastapi import APIRouter

from .repositories_impl import capability_router

_HANDLERS = (
    'list_repositories',
    'connect_repository',
    'observe_repository',
    'list_observations',
    'disconnect_repository',
)


def build_router(_source: APIRouter | None = None) -> APIRouter:
    return capability_router
