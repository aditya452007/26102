"""Request-scoped dependencies (DI pattern).

- `current_officer`: bearer JWT (or the `nirikshan_session` cookie used by the
  TanStack server-fn proxy) → OfficerClaims. 401 on anything invalid.
- `require_ministry`: role gate for admin-only endpoints (recompute).

NOTE (Pony + FastAPI concurrency law, ADR-032): there is deliberately NO
`db_session` yield-dependency. FastAPI runs sync dependency enter/exit through
`run_in_threadpool`, so under concurrent requests they can land on DIFFERENT
threads while Pony's session is thread-local → leaked session counter →
`assert not local.db_context_counter` → 500. Services own their transactions
with `with orm.db_session:` blocks (or `@orm.db_session` on cached impls),
which always enter and exit on the calling thread.
"""

from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.common.errors import AuthError, ScopeForbiddenError
from app.core.security import SESSION_COOKIE, OfficerClaims, decode_token

_bearer = HTTPBearer(auto_error=False)


def current_officer(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    request: Request,
) -> OfficerClaims:
    token = creds.credentials if creds else request.cookies.get(SESSION_COOKIE)
    if not token:
        raise AuthError("Not authenticated")
    try:
        return decode_token(token)
    except Exception as exc:  # JWTError family — signature, expiry, malformed
        raise AuthError("Invalid or expired token") from exc


CurrentOfficer = Annotated[OfficerClaims, Depends(current_officer)]


def require_ministry(officer: CurrentOfficer) -> OfficerClaims:
    if not officer.is_ministry:
        raise ScopeForbiddenError("Ministry role required")
    return officer


MinistryOnly = Annotated[OfficerClaims, Depends(require_ministry)]
