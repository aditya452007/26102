"""Shared wire-contract bases — camelCase JSON out, the twin of mplads-schema.ts.

Law (implementation-plan §3): the wire is camelCase, money is float lakhs, dates
are `yyyy-MM-dd`, timestamps are ISO-8601 UTC ending in `Z`. One base class
(`CamelModel`) plus one timestamp type (`ZuluTs`) covers every response model.
"""

from datetime import date, datetime, timezone
from typing import Annotated, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, PlainSerializer
from pydantic.alias_generators import to_camel

T = TypeVar("T")


def _zulu(dt: datetime) -> str:
    """`2026-09-07T09:45:00.000Z` — the frontend's timestamp shape."""
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")


ZuluTs = Annotated[datetime, PlainSerializer(_zulu)]


class CamelModel(BaseModel):
    """Base for every response model — serializes by camelCase alias."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Page(CamelModel, Generic[T]):
    """Paginated ledger envelope: `{"items", "total", "page", "pageSize"}`."""

    items: list[T]
    total: int
    page: int
    page_size: int


class ItemsOut(CamelModel, Generic[T]):
    """Plain list envelope: `{"items", "total"}`."""

    items: list[T]
    total: int


__all__ = ["CamelModel", "Page", "ItemsOut", "ZuluTs", "date", "to_camel"]
