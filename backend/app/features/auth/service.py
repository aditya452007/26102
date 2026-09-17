"""Auth service — credential verification + token minting.

Plain functions, Pydantic in/out (structure.md law): no Pony entities escape,
no HTTP concepts here. Auth failures raise AppError subclasses that the central
handler maps to 401. The Pony binding happens once at app startup (main.py),
not per request.
"""

from pony import orm

from app.common.errors import AuthError, NotFoundError
from app.core.config import get_settings
from app.core import security
from app.core.security import OfficerClaims
from app.features.auth.repo import find_by_email
from app.features.auth.schemas import LoginIn, OfficerOut, TokenOut


def _officer_out(o) -> OfficerOut:
    return OfficerOut(
        id=str(o.id),
        email=o.email,
        full_name=o.full_name,
        role=o.role,
        state_scope=o.state_scope,
        district_scope=o.district_scope,
    )


def login(payload: LoginIn) -> tuple[TokenOut, OfficerClaims]:
    """Returns (token response, claims) — the router adds the session cookie."""
    with orm.db_session:
        officer = find_by_email(payload.email)
        if officer is None or not security.verify_password(payload.password, officer.password_hash):
            raise AuthError("Invalid email or password")
        claims = OfficerClaims(
            id=officer.id,
            email=officer.email,
            role=officer.role,
            state_scope=officer.state_scope,
            district_scope=officer.district_scope,
        )
        out = TokenOut(
            access_token=security.create_access_token(claims),
            expires_in=get_settings().jwt_expire_minutes * 60,
            officer=_officer_out(officer),
        )
    return out, claims


def me(claims: OfficerClaims) -> OfficerOut:
    """Current officer profile — one lookup by the JWT's subject id."""
    from app.core.db import Officer

    with orm.db_session:
        officer = Officer.get(id=claims.id)
        if officer is None:
            raise NotFoundError("Officer no longer exists")
        return _officer_out(officer)
