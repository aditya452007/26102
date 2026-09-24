"""Anomaly wire schemas — the exact `anomalySchema` shape (mplads-schema.ts twin).

Owned by the anomalies feature; dossier/copilot/notifications import from here
(one source of truth per contract shape — structure.md cross-feature rule).
"""

from app.common.schemas import CamelModel, ZuluTs


class SignalOut(CamelModel):
    label: str
    value: str


class AnomalyOut(CamelModel):
    id: str
    work_id: str
    kind: str
    severity: str
    headline: str
    peer_n: int
    peer_median_rs: int | None
    actual_rs: int | None
    unit: str
    corroboration: str
    signals: list[SignalOut]


class WorkSummaryOut(CamelModel):
    """Work fields joined onto an anomaly (the explain tool)."""

    id: str
    title: str
    district: str
    state: str
    sanctioned_rs: int
    progress_pct: int


class AnomalyDetailOut(CamelModel):
    anomaly: AnomalyOut
    work: WorkSummaryOut


class RecomputeOut(CamelModel):
    run: ZuluTs
    detector_version: str
    anomalies_created: int
