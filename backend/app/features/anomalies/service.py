"""Anomalies service — flag list, explain, recompute (ministry-only)."""

from datetime import datetime, timezone

from pony import orm

from app.common.errors import NotFoundError
from app.common.schemas import ItemsOut
from app.core.config import get_settings
from app.core.security import OfficerClaims
from app.features.anomalies import repo
from app.features.anomalies.engine.pipeline import run
from app.features.anomalies.schemas import AnomalyDetailOut, AnomalyOut, RecomputeOut, SignalOut, WorkSummaryOut


def _anomaly_out(a, signals) -> AnomalyOut:
    return AnomalyOut(
        id=a.id,
        work_id=a.work.id,
        kind=a.kind,
        severity=a.severity,
        headline=a.headline,
        peer_n=a.peer_n,
        peer_median_rs=int(a.peer_median_rs) if a.peer_median_rs is not None else None,
        actual_rs=int(a.actual_rs) if a.actual_rs is not None else None,
        unit=a.unit,
        corroboration=a.corroboration,
        signals=[SignalOut(label=s.label, value=s.value) for s in signals],
    )


def list_anomalies(
    claims: OfficerClaims,
    work_id: str | None,
    severity: str | None,
    kind: str | None,
    limit: int,
) -> ItemsOut[AnomalyOut]:
    with orm.db_session:
        rows, total = repo.list_anomalies(claims, work_id, severity, kind, limit)
        items = [_anomaly_out(a, repo.signals_of(a)) for a in rows]
    return ItemsOut[AnomalyOut](items=items, total=total)


def explain(claims: OfficerClaims, anomaly_id: str) -> AnomalyDetailOut:
    """The explainFlag copilot tool: one flag + its work summary."""
    with orm.db_session:
        a = repo.get_scoped(anomaly_id, claims)
        if a is None:
            raise NotFoundError(f"Anomaly {anomaly_id} not found")
        summary = repo.work_summary(a.work)
        out = _anomaly_out(a, repo.signals_of(a))
    return AnomalyDetailOut(
        anomaly=out,
        work=WorkSummaryOut(
            id=summary["id"],
            title=summary["title"],
            district=summary["district"],
            state=summary["state"],
            sanctioned_rs=summary["sanctioned_rs"],
            progress_pct=summary["progress_pct"],
        ),
    )


def recompute(officer: OfficerClaims) -> RecomputeOut:
    """Ministry-only (router enforces). Runs the pipeline; report is the proof-of-work.

    Owns its own serializable transaction via pipeline.persist — must not be
    called inside another db_session (see router note).
    """
    result = run(get_settings().demo_today)
    return RecomputeOut(
        run=datetime.now(timezone.utc),
        detector_version=result["detectorVersion"],
        anomalies_created=result["anomaliesCreated"],
    )
