"""Auth routes (Feature_docs/01-login/backend.md).

POST /auth/login  → 200 TokenOut + `nirikshan_session` httpOnly cookie (the
TanStack server-fn proxy forwards the cookie; the browser never handles JWTs).
GET  /auth/me     → 200 OfficerOut
POST /auth/logout → clears the cookie.
"""

from fastapi import APIRouter, Response

from app.core.deps import CurrentOfficer
from app.core.security import SESSION_COOKIE
from app.features.auth.schemas import LoginIn, OfficerOut, TokenOut
from app.features.auth import service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, response: Response):
    token, claims = service.login(payload)
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token.access_token,
        httponly=True,
        samesite="lax",
        max_age=7 * 24 * 3600,
        secure=False,  # demo runs behind plain HTTP; flip at deployment
    )
    return token


@router.get("/me", response_model=OfficerOut)
def me(officer: CurrentOfficer):
    return service.me(officer)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE)
    return {"detail": "logged out"}
