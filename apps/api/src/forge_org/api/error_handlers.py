"""Single place where domain errors become HTTP responses."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from forge_org.domain.errors import Conflict, InvalidInput, NotFound, StorageCorrupt


def _respond(status_code: int, detail: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={'detail': detail})


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFound)
    async def not_found(_request: Request, exc: NotFound) -> JSONResponse:
        return _respond(404, str(exc))

    @app.exception_handler(InvalidInput)
    async def invalid_input(_request: Request, exc: InvalidInput) -> JSONResponse:
        return _respond(422, str(exc))

    @app.exception_handler(Conflict)
    async def conflict(_request: Request, exc: Conflict) -> JSONResponse:
        return _respond(409, str(exc))

    @app.exception_handler(StorageCorrupt)
    async def storage_corrupt(_request: Request, _exc: StorageCorrupt) -> JSONResponse:
        return _respond(500, 'Unable to process Bug screenshot')
