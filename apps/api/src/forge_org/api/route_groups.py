"""Composition root for bounded capability routers."""

from fastapi import APIRouter

from .capability_routes import (
    attachments,
    organization,
    planning,
    transfer,
)


def build_capability_router(source: APIRouter | None = None) -> APIRouter:
    """Compose concrete capability routes into a legacy-compatible router.

    ``APIRouter.include_router`` stores nested include markers in this FastAPI
    version. That is suitable for application startup, but it makes the
    historical ``forge_org.api.routes.router`` facade impossible to inspect
    and causes compatibility checks to compare against an empty surface.
    Capability routers already carry the public ``/api/v1`` prefix, so append
    their concrete route objects directly. Treat a populated source as an
    idempotent composition request because application startup passes the
    legacy facade back through this function.
    """
    composed = source or APIRouter()
    if composed.routes:
        return composed
    for module in (
        planning,
        attachments,
        organization,
        transfer,
    ):
        composed.routes.extend(module.build_router(source).routes)
    return composed
