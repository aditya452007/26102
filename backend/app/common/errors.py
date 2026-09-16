"""AppError hierarchy + central handlers — the ONLY place exceptions become HTTP.

Every expected failure is an `AppError` subclass carrying its own status; routers
never try/except. The wire shape is always `{"detail": "<human message>"}`
(README.md error model). Unknown exceptions are logged with the request id and
answered with a generic 500 — internals never leak (ssdlc).
"""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

log = logging.getLogger(__name__)


class AppError(Exception):
    """Base for all expected application failures."""

    status: int = 400

    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.message = message
        if status is not None:
            self.status = status


class AuthError(AppError):
    """401 — missing/expired/invalid credentials."""

    status = 401


class ScopeForbiddenError(AppError):
    """403 — valid token, but the target is outside the officer's scope."""

    status = 403


class NotFoundError(AppError):
    """404 — unknown id (or out-of-scope read; we don't confirm existence)."""

    status = 404


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status, content={"detail": exc.message})

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
        rid = getattr(request.state, "request_id", "-")
        log.exception("[%s] unhandled error", rid)
        return JSONResponse(
            status_code=500, content={"detail": "Internal server error"}
        )
