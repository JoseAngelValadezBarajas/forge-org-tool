"""FORGE Org Tool API composition root."""
from fastapi import FastAPI
from pydantic import BaseModel

from forge_org.api.routes import router as organization_router


class HealthResponse(BaseModel):
    service: str
    status: str
    scope: str


def create_app() -> FastAPI:
    app = FastAPI(title="FORGE Org Tool API", version="0.2.0")

    @app.get("/api/v1/health", response_model=HealthResponse, tags=["system"])
    def health() -> HealthResponse:
        return HealthResponse(
            service="forge-org-api", status="ok", scope="organization-foundation"
        )

    app.include_router(organization_router)
    return app


app = create_app()
