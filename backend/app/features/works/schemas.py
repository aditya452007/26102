"""Works wire schemas — the `workSchema`/`workRowSchema` twins (21 fields + row)."""

from dataclasses import dataclass
from datetime import date

from fastapi import Query

from app.common.schemas import CamelModel
from app.features.anomalies.schemas import AnomalyOut
from app.features.decisions.schemas import ActivityOut, DecisionOut
from app.features.evidence.schemas import EvidenceOut


@dataclass
class WorkFilters:
    """`GET /works` query params — mirrors the frontend URL state (?lens=&state=…)."""

    lens: str = Query("all", pattern="^(all|needs-review|high-risk)$")
    state: str | None = Query(None)
    district: str | None = Query(None)
    type: str | None = Query(
        None, pattern="^(road|community-hall|water|school|drainage|streetlight)$"
    )
    status: str | None = Query(None, pattern="^(in-execution|completed|sanctioned|stalled)$")
    q: str | None = Query(None)
    sort: str = Query("id", pattern="^(amount|updated|id)$")
    order: str | None = Query(None, pattern="^(asc|desc)$")  # None → resolve by sort
    page: int = Query(1, ge=1)
    page_size: int = Query(20, alias="pageSize", ge=1, le=200)  # 144-work demo needs single-page overview fetch


class WorkOut(CamelModel):
    """The bare Work object — all 21 contract fields."""

    id: str
    title: str
    type: str
    state: str
    district: str
    agency: str
    status: str
    sanctioned_rs: int
    expenditure_rs: int
    progress_pct: int
    sanction_date: date
    due_date: date
    last_update: date
    lat: float | None
    lon: float | None
    tender_holder: str
    tender_awarded_by: str
    department: str
    labour_deployed: int
    demanded_days: int
    returned_rs: int


class WorkRowOut(CamelModel):
    """The ledger row: work fields + the officer's worst anomaly (`buildWorksRows`)."""

    id: str
    title: str
    agency: str
    type: str
    district: str
    state: str
    sanctioned_rs: int
    progress_pct: int
    status: str
    last_update: date
    severity: str | None
    kind: str | None


class PeerRowOut(CamelModel):
    metric: str
    work_value: float
    peer_median: float


class PeerMemberOut(CamelModel):
    id: str
    title: str
    sanctioned_rs: int


class PeersOut(CamelModel):
    work_id: str
    peer_n: int
    rows: list[PeerRowOut]
    members: list[PeerMemberOut]


class DossierOut(CamelModel):
    """The one-call dossier bundle (api-reference.md §dossier).

    No `peers` block: the dossier UI consumes peer numbers from the stored
    anomalies (as does the copilot); real peer computation lives in
    `GET /works/{work_id}/peers` (ADR-031).
    """

    work: WorkOut
    anomalies: list[AnomalyOut]
    evidence: list[EvidenceOut]
    activity: list[ActivityOut]
    decision: DecisionOut | None
