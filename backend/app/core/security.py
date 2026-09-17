"""Security primitives — bcrypt password hashing + JWT issue/decode (HS256).

Direct `bcrypt` library instead of passlib (ADR-030): passlib 1.7.4 is unmaintained
and incompatible with bcrypt >= 4.1; two bcrypt calls need no wrapper library.
JWT claims carry the officer's role + scope so request authz never re-queries the
officer row (stateless per Feature_docs/01-login/backend.md).
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings

SESSION_COOKIE = "nirikshan_session"


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except ValueError:
        return False


@dataclass(frozen=True)
class OfficerClaims:
    """The JWT's officer identity — what every authz decision sees."""

    id: UUID
    email: str
    role: str  # district | state | ministry
    state_scope: str | None
    district_scope: str | None

    @property
    def is_ministry(self) -> bool:
        return self.role == "ministry"


def create_access_token(claims: OfficerClaims) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(claims.id),
        "email": claims.email,
        "role": claims.role,
        "stateScope": claims.state_scope,
        "districtScope": claims.district_scope,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> OfficerClaims:
    """Raises JWTError on bad signature/expiry — callers map it to AuthError."""
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    return OfficerClaims(
        id=UUID(payload["sub"]),
        email=payload["email"],
        role=payload["role"],
        state_scope=payload.get("stateScope"),
        district_scope=payload.get("districtScope"),
    )
