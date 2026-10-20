"""Authenticated loopback composition root for the Windows desktop host."""

import hmac
import os

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from forge_org.main import create_app

MIN_TOKEN_LENGTH = 32


class BearerTokenMiddleware:
    def __init__(self, app: ASGIApp, token: str) -> None:
        self.app = app
        self.token = token.encode('utf-8')

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope['type'] != 'http':
            await self.app(scope, receive, send)
            return
        headers = {key.lower(): value for key, value in scope.get('headers', [])}
        expected = b'Bearer ' + self.token
        if not hmac.compare_digest(headers.get(b'authorization', b''), expected):
            response = JSONResponse({'detail': 'Desktop sidecar authentication required'}, status_code=401)
            await response(scope, receive, send)
            return
        await self.app(scope, receive, send)


def create_sidecar_app(token: str) -> FastAPI:
    if len(token) < MIN_TOKEN_LENGTH:
        raise ValueError(f'Sidecar token must be at least {MIN_TOKEN_LENGTH} characters')
    app = create_app()
    app.add_middleware(BearerTokenMiddleware, token=token)
    return app


def sidecar_app_from_environment() -> FastAPI:
    token = os.environ.get('FORGE_SIDECAR_TOKEN', '')
    return create_sidecar_app(token)


app = sidecar_app_from_environment() if os.environ.get('FORGE_SIDECAR_TOKEN') else None
