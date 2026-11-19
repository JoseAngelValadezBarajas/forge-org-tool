"""FORGE Org Tool API composition root."""

import os

from fastapi import FastAPI
from pydantic import BaseModel
from starlette.middleware.trustedhost import TrustedHostMiddleware

from forge_org.api.error_handlers import register_error_handlers
from forge_org.api.routes import router as legacy_router

# Loopback names only, so a page on another origin cannot reach the local API by rebinding its DNS
# name to 127.0.0.1 (the Host header would then be the attacker's name). `testserver` is the
# Starlette test client. Extra hosts can be added with FORGE_ALLOWED_HOSTS (comma separated).
DEFAULT_ALLOWED_HOSTS = ('127.0.0.1', 'localhost', '[::1]', 'testserver')


def allowed_hosts() -> list[str]:
    extra = [host.strip() for host in os.environ.get('FORGE_ALLOWED_HOSTS', '').split(',')]
    return [*DEFAULT_ALLOWED_HOSTS, *(host for host in extra if host)]


class HealthResponse(BaseModel):
    service: str
    status: str
    scope: str


def create_app() -> FastAPI:
    app = FastAPI(title='FORGE Org Tool API', version='0.1.3')

    @app.get('/api/v1/health', response_model=HealthResponse, tags=['system'])
    def health() -> HealthResponse:
        return HealthResponse(service='forge-org-api', status='ok', scope='organization-foundation')

    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts())
    register_error_handlers(app)
    app.include_router(legacy_router)
    return app


app = create_app()
