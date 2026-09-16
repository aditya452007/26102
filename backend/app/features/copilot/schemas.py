"""Copilot wire schemas (api-reference.md §copilot)."""

from app.common.schemas import CamelModel


class GapOut(CamelModel):
    label: str
    detail: str


class MissingOut(CamelModel):
    work_id: str
    gaps: list[GapOut]
