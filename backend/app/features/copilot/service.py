"""Copilot service — deterministic tool projections of the same feature services.

`missing` derives data gaps (api-reference.md §copilot): UC pending (utilisation
anomaly), no recent measurement (no `report` evidence in 90d). Search/compare/
explain delegate to the works/anomalies services — screens and tools can never
disagree (Feature_docs/05 backend spec).
"""

from datetime import date

from pony import orm

from app.common.errors import NotFoundError
from app.common.schemas import Page
from app.core.config import get_settings
from app.core.security import OfficerClaims
from app.features.works import repo as works_repo
from app.features.works.schemas import WorkFilters, WorkRowOut
from app.features.copilot.schemas import GapOut, MissingOut
from app.features.anomalies import repo as anomalies_repo
from app.features.evidence import repo as evidence_repo

REPORT_FRESH_DAYS = 90


@orm.db_session
def _missing_impl(claims: OfficerClaims, work_id: str, today: date) -> MissingOut:
    work = works_repo.get_scoped(work_id, claims)
    if work is None:
        raise NotFoundError(f"Work {work_id} not found")

    gaps: list[GapOut] = []

    has_uc_pending = any(
        a.kind == "utilisation" for a in anomalies_repo.all_scoped(claims) if a.work.id == work.id
    )
    if has_uc_pending:
        gaps.append(
            GapOut(
                label="UC pending",
                detail="Utilisation certificate for the last release not attached",
            )
        )

    evidences = evidence_repo.evidences_for(work)
    reports = [e for e in evidences if e.kind == "report"]
    last_report = max(reports, key=lambda e: e.uploaded_at) if reports else None
    report_age = (today - last_report.uploaded_at.date()).days if last_report else None
    if report_age is None or report_age > REPORT_FRESH_DAYS:
        if evidences:
            last_any = max(evidences, key=lambda e: e.uploaded_at)
            any_age = (today - last_any.uploaded_at.date()).days
            detail = (
                f"Last evidence uploaded {any_age}d ago; "
                f"progress changed {(today - work.last_update).days}d ago"
            )
        else:
            detail = f"No evidence on file; progress changed {(today - work.last_update).days}d ago"
        gaps.append(GapOut(label="No recent measurement", detail=detail))

    return MissingOut(work_id=work.id, gaps=gaps)


def missing(claims: OfficerClaims, work_id: str) -> MissingOut:
    """Not cached: per-work freshness is the product for copilot answers."""
    return _missing_impl(claims, work_id, get_settings().demo_today)


def search(claims: OfficerClaims, q: str | None, page: int, page_size: int) -> Page[WorkRowOut]:
    """searchWorks tool — reuses the ledger semantics under the officer's scope."""
    from app.features.works import service as works_service

    # All fields explicitly: WorkFilters' class defaults are FastAPI Query objects
    # (resolved only via Depends); direct construction must pass plain values.
    filters = WorkFilters(
        lens="all", state=None, district=None, type=None, status=None,
        q=q, sort="id", order=None, page=page, page_size=page_size,
    )
    return works_service.list_works(claims, filters)
