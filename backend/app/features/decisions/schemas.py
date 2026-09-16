"""Decision + activity wire schemas (`decisionSchema` / `activitySchema` shapes)."""

from typing import Literal

from pydantic import model_serializer

from app.common.schemas import CamelModel, ZuluTs

DecisionStatus = Literal["verified", "dismissed", "action-required"]


class DecisionIn(CamelModel):
    """POST /works/{id}/decision body (api-reference.md §decisions).

    `Literal` gives boundary validation — malformed statuses 422 at the door,
    never reaching the DB CHECK.
    """

    status: DecisionStatus
    note: str = ""


class DecisionOut(CamelModel):
    id: str
    work_id: str
    status: str
    note: str
    at: ZuluTs
    by: str


class ActivityOut(CamelModel):
    id: str  # "T-{n}" string form (frontend contract)
    work_id: str
    at: ZuluTs
    actor: str
    action: str
    note: str | None = None

    @model_serializer(mode="wrap")
    def _omit_null_note(self, handler):
        """Zod law: activitySchema.note is `string.optional()` — ABSENT, never null.

        Emitting `"note": null` fails the frontend's parse (mock data omits the
        key), so None notes are dropped from the payload entirely.
        """
        data = handler(self)
        if data.get("note") is None:
            data.pop("note", None)
        return data
