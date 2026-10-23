"""Public HTTP router retained for legacy backend integrations.

The handlers are owned by the bounded capability modules, but callers that
historically imported ``forge_org.api.routes.router`` still receive the full
API surface. Keeping this composition here also makes the compatibility
contract independently inspectable without constructing the application.
"""

from fastapi import APIRouter

from forge_org.api.route_groups import build_capability_router

router: APIRouter = build_capability_router(APIRouter(prefix='/api/v1', tags=['organization']))
