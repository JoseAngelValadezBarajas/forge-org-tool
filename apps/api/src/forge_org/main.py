"""M1 composition root. No persistence, auth, or business endpoints until M2."""
from fastapi import FastAPI
from pydantic import BaseModel


class HealthResponse(BaseModel):
    service: str
    status: str
    scope: str


def create_app() -> FastAPI:
    app = FastAPI(title="FORGE Org Tool API", version="0.1.0-bootstrap")

    @app.get("/api/v1/health", response_model=HealthResponse, tags=["system"])
    def health() -> HealthResponse:
        return HealthResponse(
            service="forge-org-api", status="ok", scope="bootstrap-only"
        )

    return app


app = create_app()
