"""Evidence queries."""

import re

from pony import orm

from app.core.db import Evidence, Work


def evidences_for(work: Work) -> list[Evidence]:
    return list(
        Evidence.select(lambda e: e.work.id == work.id).order_by(
            orm.desc(Evidence.uploaded_at)
        )
    )


def get(evidence_id: str) -> Evidence | None:
    return Evidence.get(id=evidence_id)


def next_id() -> str:
    """`E-{max numeric suffix + 1}` (data-model.md; ULID only for real ingest)."""
    max_n = 0
    for e in Evidence.select():
        m = re.fullmatch(r"E-(\d+)", e.id)
        if m:
            max_n = max(max_n, int(m.group(1)))
    return f"E-{max_n + 1}"


def create(work: Work, kind: str, name: str, size_kb: int, storage_path: str | None, by: str) -> Evidence:
    return Evidence(
        id=next_id(),
        work=work,
        kind=kind,
        name=name,
        size_kb=size_kb,
        storage_path=storage_path,  # None → demo/external rows; download 404s
        by=by,
    )
