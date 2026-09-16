"""Officer queries — the only auth code that speaks Pony.

`find_by_id` is on this feature's explicit export list: evidence/decisions
services import it to resolve the officer display name for audit rows
(structure.md cross-feature rule: repos may be shared, services never).
"""

from uuid import UUID

from app.core.db import Officer


def find_by_email(email: str) -> Officer | None:
    return Officer.get(email=email)


def find_by_id(officer_id: UUID) -> Officer | None:
    return Officer.get(id=officer_id)
