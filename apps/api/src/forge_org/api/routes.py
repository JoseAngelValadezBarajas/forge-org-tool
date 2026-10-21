"""Compatibility router import for legacy backend integrations.

Concrete HTTP handlers live in capability_routes modules. Application startup
composes those routers through route_groups.build_capability_router.
"""

from fastapi import APIRouter

router = APIRouter(prefix='/api/v1', tags=['organization'])
