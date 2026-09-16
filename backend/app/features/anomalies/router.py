"""Anomalies routes: GET /anomalies, GET /anomalies/{id}, POST /detectors/recompute.

Paths are written in full (no router prefix). Recompute is ministry-only.
"""

from typing import Annotated

from fastapi import APIRouter, Query

from app.common.schemas import ItemsOut
from app.core.deps import CurrentOfficer, MinistryOnly
from app.features.anomalies import service
from app.features.anomalies.schemas import AnomalyDetailOut, AnomalyOut, RecomputeOut

router = APIRouter(tags=["anomalies"])


@router.get("/anomalies", response_model=ItemsOut[AnomalyOut])
def list_anomalies(
    officer: CurrentOfficer,
    work_id: Annotated[str | None, Query(alias="workId")] = None,
    severity: Annotated[str | None, Query(pattern="^(high|medium|low)$")] = None,
    kind: Annotated[
        str | None, Query(pattern="^(cost|expenditure|delay|duplicate|utilisation)$")
    ] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
):
    """Global scoped flag list (queue, notifications, copilot feed)."""
    return service.list_anomalies(officer, work_id, severity, kind, limit)


@router.get("/anomalies/{anomaly_id}", response_model=AnomalyDetailOut)
def explain_anomaly(anomaly_id: str, officer: CurrentOfficer):
    """explainFlag tool — one flag + its work summary (404 outside scope)."""
    return service.explain(officer, anomaly_id)


@router.post("/detectors/recompute", response_model=RecomputeOut)
def recompute(officer: MinistryOnly):
    """Run all detectors and replace flags (ministry role required).

    Deliberately runs OUTSIDE any request-scoped session: the pipeline owns its
    own serializable transaction (a nested serializable session inside another
    db_session is a Pony TransactionError). Readers see the old generation
    until the replace commits — MVCC at its best.
    """
    return service.recompute(officer)
