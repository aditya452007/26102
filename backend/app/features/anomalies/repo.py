"""Anomaly queries.

Ordering by severity rank is Python-side (Pony lambdas can't translate dict
lookups); the flag list is small, so this stays simple and correct.
"""

from pony import orm

from app.core.db import Anomaly, AnomalySignal, Work
from app.core.security import OfficerClaims

SEVERITY_RANK = {"high": 0, "medium": 1, "low": 2}


def _scoped_query(claims: OfficerClaims):
    """RBAC law: every list endpoint scopes in the query, before filters."""
    if claims.is_ministry:
        return Anomaly.select()
    if claims.role == "state":
        return Anomaly.select(lambda a: a.work.state == claims.state_scope)
    return Anomaly.select(lambda a: a.work.district == claims.district_scope)


def all_scoped(claims: OfficerClaims) -> list[Anomaly]:
    """Every in-scope anomaly (read models: notifications, geo rollup)."""
    return list(_scoped_query(claims))


def get_scoped(anomaly_id: str, claims: OfficerClaims) -> Anomaly | None:
    if claims.is_ministry:
        return Anomaly.get(id=anomaly_id)
    if claims.role == "state":
        return Anomaly.get(
            lambda a: a.id == anomaly_id and a.work.state == claims.state_scope
        )
    return Anomaly.get(
        lambda a: a.id == anomaly_id and a.work.district == claims.district_scope
    )


def list_anomalies(
    claims: OfficerClaims,
    work_id: str | None,
    severity: str | None,
    kind: str | None,
    limit: int,
) -> tuple[list[Anomaly], int]:
    query = _scoped_query(claims)
    if work_id:
        query = query.filter(lambda a: a.work.id == work_id)
    if severity:
        query = query.filter(lambda a: a.severity == severity)
    if kind:
        query = query.filter(lambda a: a.kind == kind)
    total = query.count()
    rows = sorted(query, key=lambda a: (SEVERITY_RANK[a.severity], a.id))
    return rows[:limit], total


def get(anomaly_id: str) -> Anomaly | None:
    return Anomaly.get(id=anomaly_id)


def work_summary(work: Work) -> dict:
    return {
        "id": work.id,
        "title": work.title,
        "district": work.district,
        "state": work.state,
        "sanctioned_lakh": float(work.sanctioned_lakh),
        "progress_pct": work.progress_pct,
    }


def signals_of(anomaly: Anomaly) -> list:
    return list(
        AnomalySignal.select(lambda s: s.anomaly.id == anomaly.id).order_by(
            AnomalySignal.position
        )
    )
