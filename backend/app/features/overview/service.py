"""Overview service — KPIs, geo rollup, priority queue.

- KPIs are the static scheme-snapshot constants (api-reference.md; scope-agnostic
  by design until real ingest).
- Geo rollup is the exact `buildGeoRollup` port, computed over the officer's
  scope, cached per scope (scoping happens before caching).
- Queue: flagged works ranked by severity then stall days (api-reference.md).
"""

from datetime import date

from pony import orm

from app.common.caching import cached
from app.common.mathutil import stall_days
from app.common.schemas import ItemsOut
from app.core.config import get_settings
from app.core.security import OfficerClaims
from app.features.anomalies import repo as anomalies_repo
from app.features.overview.schemas import GeoRowOut, KpiOut
from app.features.works import repo as works_repo
from app.features.works.schemas import WorkRowOut
from app.seed.generate import MPLADS_KPIS

SEVERITY_RANK = {"high": 0, "medium": 1, "low": 2}


def kpis() -> KpiOut:
    return KpiOut(
        total_works=MPLADS_KPIS["totalWorks"],
        under_execution=MPLADS_KPIS["underExecution"],
        delayed=MPLADS_KPIS["delayed"],
        high_risk=MPLADS_KPIS["highRisk"],
        overrun_exposure_rs=MPLADS_KPIS["overrunExposureRs"],
    )


@orm.db_session
def _geo_impl(claims: OfficerClaims, today: date) -> list[GeoRowOut]:
    works = works_repo.all_scoped(claims)
    high_ids = {
        a.work.id for a in anomalies_repo.all_scoped(claims) if a.severity == "high"
    }
    by_state: dict[str, GeoRowOut] = {}
    for w in works:
        row = by_state.setdefault(w.state, GeoRowOut(state=w.state, works=0, high=0, delayed=0, stalled=0))
        row.works += 1
        if w.id in high_ids:
            row.high += 1
        if w.status == "stalled":
            row.stalled += 1
            row.delayed += 1
        elif w.status == "in-execution" and w.due_date < today:
            row.delayed += 1
    return sorted(by_state.values(), key=lambda r: r.state)


@cached(ttl=300)
def _geo_cached(claims: OfficerClaims, today: date) -> list[GeoRowOut]:
    return _geo_impl(claims, today)


def geo(claims: OfficerClaims) -> ItemsOut[GeoRowOut]:
    items = _geo_cached(claims, get_settings().demo_today)
    return ItemsOut[GeoRowOut](items=items, total=len(items))


@orm.db_session
def _queue_impl(claims: OfficerClaims, today: date, limit: int) -> list[WorkRowOut]:
    works = works_repo.all_scoped(claims)
    worst: dict[str, tuple[str, str]] = {}  # work_id → (severity, kind)
    for a in anomalies_repo.all_scoped(claims):
        cur = worst.get(a.work.id)
        if cur is None or SEVERITY_RANK[a.severity] < SEVERITY_RANK[cur[0]]:
            worst[a.work.id] = (a.severity, a.kind)
    flagged = [w for w in works if w.id in worst]
    flagged.sort(key=lambda w: (SEVERITY_RANK[worst[w.id][0]], -stall_days(w.last_update, today)))
    return [
        WorkRowOut(
            id=w.id,
            title=w.title,
            agency=w.agency,
            type=w.type,
            district=w.district,
            state=w.state,
            sanctioned_rs=int(w.sanctioned_rs),
            progress_pct=w.progress_pct,
            status=w.status,
            last_update=w.last_update,
            severity=worst[w.id][0],
            kind=worst[w.id][1],
        )
        for w in flagged[:limit]
    ]


@cached(ttl=300)
def _queue_cached(claims: OfficerClaims, today: date, limit: int) -> list[WorkRowOut]:
    return _queue_impl(claims, today, limit)


def queue(claims: OfficerClaims, limit: int) -> ItemsOut[WorkRowOut]:
    items = _queue_cached(claims, get_settings().demo_today, limit)
    return ItemsOut[WorkRowOut](items=items, total=len(items))
