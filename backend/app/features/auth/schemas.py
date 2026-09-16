"""Auth wire schemas (Feature_docs/01-login/backend.md + api-reference.md §auth)."""

from app.common.schemas import CamelModel


class LoginIn(CamelModel):
    email: str
    password: str


class OfficerOut(CamelModel):
    id: str
    email: str
    full_name: str
    role: str
    state_scope: str | None
    district_scope: str | None


class TokenOut(CamelModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    officer: OfficerOut
