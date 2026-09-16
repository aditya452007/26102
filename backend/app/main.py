"""FastAPI factory — the single assembly point (Factory pattern).

Adds, in order: request-id middleware (debuggability), CORS allowlist (ssdlc —
only the TanStack origin; the primary path is the server-fn proxy), central
error handlers, then feature routers under /api/v1 as features are built.
"""

import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request

from app.common.errors import register_error_handlers

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    from app.core.db import bind_database

    bind_database()  # fail fast: bad DSN dies at boot, not on first request
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="NIRIKSHAN-AI API",
        version="0.1.0",
        description="MPLADS risk-intelligence backend (SIH26102 demo)",
        lifespan=lifespan,
    )

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        rid = uuid.uuid4().hex[:8]
        request.state.request_id = rid
        response = await call_next(request)
        response.headers["X-Request-Id"] = rid
        return response

    register_error_handlers(app)

    @app.get("/healthz", tags=["meta"])
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    _mount_features(app)
    return app


def _mount_features(app: FastAPI) -> None:
    """Feature routers, mounted as built (structure.md feature-first law)."""
    from app.features.auth.router import router as auth_router
    from app.features.works.router import router as works_router
    from app.features.anomalies.router import router as anomalies_router
    from app.features.evidence.router import router as evidence_router
    from app.features.decisions.router import router as decisions_router
    from app.features.notifications.router import router as notifications_router
    from app.features.overview.router import router as overview_router
    from app.features.copilot.router import router as copilot_router

    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(works_router, prefix="/api/v1")
    app.include_router(anomalies_router, prefix="/api/v1")
    app.include_router(evidence_router, prefix="/api/v1")
    app.include_router(decisions_router, prefix="/api/v1")
    app.include_router(notifications_router, prefix="/api/v1")
    app.include_router(overview_router, prefix="/api/v1")
    app.include_router(copilot_router, prefix="/api/v1")


app = create_app()
