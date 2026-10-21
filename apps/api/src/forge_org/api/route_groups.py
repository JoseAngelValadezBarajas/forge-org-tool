"""Composition root for bounded capability routers."""

from fastapi import APIRouter

from .capability_routes import (
    context,
    delivery,
    organization,
    planning,
    readiness,
    repositories,
    transfer,
    workbench,
)


def build_capability_router(source: APIRouter) -> APIRouter:
    """Compose capability routers without changing the public HTTP contract."""
    composed = APIRouter()
    for module in (
        planning,
        organization,
        readiness,
        repositories,
        context,
        workbench,
        delivery,
        transfer,
    ):
        composed.include_router(module.build_router(source))
    return composed
