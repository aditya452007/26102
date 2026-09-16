"""Work queries — the only works code that speaks Pony.

Scope model (README.md): the officer's role becomes a scope predicate **before**
any filter, so a district officer physically cannot read another district's rows.
Ministry sees everything. Pony lambdas must be AST-translatable: no closures
inside them — captured locals are fine, called functions are not.
"""

from pony import orm

from app.core.db import Activity, Anomaly, AnomalySignal, Evidence, Work, WorkDecision
from app.core.security import OfficerClaims
from app.features.works.schemas import WorkFilters

SEVERITY_RANK = {"high": 0, "medium": 1, "low": 2}


def _scoped_query(claims: OfficerClaims):
    if claims.is_ministry:
        return Work.select()
    if claims.role == "state":
        return Work.select(lambda w: w.state == claims.state_scope)
    return Work.select(lambda w: w.district == claims.district_scope)


def get_scoped(work_id: str, claims: OfficerClaims) -> Work | None:
    """Plain-Python scope check + fetch; None → service raises 404."""
    if claims.is_ministry:
        return Work.get(id=work_id)
    if claims.role == "state":
        return Work.get(lambda w: w.id == work_id and w.state == claims.state_scope)
    return Work.get(lambda w: w.id == work_id and w.district == claims.district_scope)


def get_any(work_id: str) -> Work | None:
    """Existence check without scope (write flows distinguish 404 from 403)."""
    return Work.get(id=work_id)


def in_scope(work: Work, claims: OfficerClaims) -> bool:
    """Plain-Python scope test for write flows (reads never confirm existence)."""
    if claims.is_ministry:
        return True
    if claims.role == "state":
        return work.state == claims.state_scope
    return work.district == claims.district_scope


def page_for(claims: OfficerClaims, f: WorkFilters) -> tuple[list[Work], int]:
    """Filtered, sorted, paginated ledger page + total count."""
    query = _scoped_query(claims)
    if f.lens == "needs-review":
        query = query.filter(lambda w: orm.count(a for a in w.anomalies) > 0)
    elif f.lens == "high-risk":
        query = query.filter(lambda w: orm.count(a for a in w.anomalies if a.severity == "high") > 0)
    if f.state:
        query = query.filter(lambda w: w.state == f.state)
    if f.district:
        query = query.filter(lambda w: w.district == f.district)
    if f.type:
        query = query.filter(lambda w: w.type == f.type)
    if f.status:
        query = query.filter(lambda w: w.status == f.status)
    if f.q:
        needle = f.q.lower()
        query = query.filter(
            lambda w: needle in w.id.lower() or needle in w.title.lower() or needle in w.agency.lower()
        )

    total = query.count()
    order_attr = {
        "id": Work.id,
        "amount": Work.sanctioned_lakh,
        "updated": Work.last_update,
    }[f.sort]
    ordered = query.order_by(orm.desc(order_attr) if f.order == "desc" else order_attr)
    return ordered.page(f.page, f.page_size), total


def worst_anomaly_map(work_ids: list[str]) -> dict[str, Anomaly]:
    """Worst anomaly per work (severity rank high < medium < low) for ledger rows."""
    if not work_ids:
        return {}
    result: dict[str, Anomaly] = {}
    for a in Anomaly.select(lambda a: a.work.id in work_ids):
        cur = result.get(a.work.id)
        if cur is None or SEVERITY_RANK[a.severity] < SEVERITY_RANK[cur.severity]:
            result[a.work.id] = a
    return result


def all_scoped(claims: OfficerClaims) -> list[Work]:
    """Every in-scope work (read models: notifications, geo rollup, queue)."""
    return list(_scoped_query(claims))


def peer_group(work: Work) -> list[Work]:
    """Same type AND same state, excluding the work itself (data-model.md law)."""
    return Work.select(
        lambda w: w.type == work.type and w.state == work.state and w.id != work.id
    )[:]


def latest_decision(work: Work) -> WorkDecision | None:
    return (
        WorkDecision.select(lambda d: d.work.id == work.id)
        .order_by(orm.desc(WorkDecision.at))
        .first()
    )


def activities_for(work: Work) -> list[Activity]:
    return list(
        Activity.select(lambda t: t.work.id == work.id).order_by(orm.desc(Activity.at))
    )


def evidences_for(work: Work) -> list[Evidence]:
    return list(
        Evidence.select(lambda e: e.work.id == work.id).order_by(
            orm.desc(Evidence.uploaded_at)
        )
    )


def anomalies_for(work: Work) -> list[Anomaly]:
    anomalies = list(Anomaly.select(lambda a: a.work.id == work.id))
    anomalies.sort(key=lambda a: (SEVERITY_RANK[a.severity], a.id))
    return anomalies


def signals_for(anomaly_ids: list[str]) -> dict[str, list[AnomalySignal]]:
    if not anomaly_ids:
        return {}
    out: dict[str, list[AnomalySignal]] = {}
    for s in AnomalySignal.select(lambda s: s.anomaly.id in anomaly_ids).order_by(
        AnomalySignal.position
    ):
        out.setdefault(s.anomaly.id, []).append(s)
    return out
