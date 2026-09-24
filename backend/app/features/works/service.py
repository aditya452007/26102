"""Works service — lens semantics, worst-anomaly rows, dossier, peers.

Plain functions, Pydantic in/out. All Pony access happens inside `db_session`
blocks; entities never escape (implementation-plan §3 — the #1 Pony trap).
"""

from datetime import date

from pony import orm

from app.common.errors import NotFoundError
from app.common.caching import cached
from app.common.mathutil import median, one_decimal, stall_days
from app.common.schemas import Page
from app.core.config import get_settings
from app.core.security import OfficerClaims
from app.features.anomalies.schemas import AnomalyOut, SignalOut
from app.features.decisions.schemas import ActivityOut, DecisionOut
from app.features.evidence.schemas import EvidenceOut
from app.features.works import repo
from app.features.works.schemas import (
    DossierOut,
    PeerMemberOut,
    PeerRowOut,
    PeersOut,
    WorkFilters,
    WorkOut,
    WorkRowOut,
)


def _work_out(w) -> WorkOut:
    return WorkOut(
        id=w.id,
        title=w.title,
        type=w.type,
        state=w.state,
        district=w.district,
        agency=w.agency,
        status=w.status,
        sanctioned_rs=int(w.sanctioned_rs),
        expenditure_rs=int(w.expenditure_rs),
        progress_pct=w.progress_pct,
        sanction_date=w.sanction_date,
        due_date=w.due_date,
        last_update=w.last_update,
        lat=float(w.lat) if w.lat is not None else None,
        lon=float(w.lon) if w.lon is not None else None,
        tender_holder=w.tender_holder,
        tender_awarded_by=w.tender_awarded_by,
        department=w.department,
        labour_deployed=w.labour_deployed,
        demanded_days=w.demanded_days,
        returned_rs=int(w.returned_rs),
    )


def _anomaly_out(a, signals: list) -> AnomalyOut:
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


def _get_scoped_work(work_id: str, claims: OfficerClaims):
    with orm.db_session:
        work = repo.get_scoped(work_id, claims)
        if work is None:
            raise NotFoundError(f"Work {work_id} not found")
        return work


def list_works(claims: OfficerClaims, f: WorkFilters) -> Page[WorkRowOut]:
    """The ledger: scoped page + each work's worst anomaly, `buildWorksRows` style."""
    order = f.order or ("asc" if f.sort == "id" else "desc")
    f.order = order
    with orm.db_session:
        rows, total = repo.page_for(claims, f)
        worst = repo.worst_anomaly_map([w.id for w in rows])
        items = [
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
                severity=worst[w.id].severity if w.id in worst else None,
                kind=worst[w.id].kind if w.id in worst else None,
            )
            for w in rows
        ]
    return Page[WorkRowOut](items=items, total=total, page=f.page, page_size=f.page_size)


def get_work(claims: OfficerClaims, work_id: str) -> WorkOut:
    with orm.db_session:
        work = repo.get_scoped(work_id, claims)
        if work is None:
            raise NotFoundError(f"Work {work_id} not found")
        return _work_out(work)


def get_dossier(claims: OfficerClaims, work_id: str) -> DossierOut:
    with orm.db_session:
        work = repo.get_scoped(work_id, claims)
        if work is None:
            raise NotFoundError(f"Work {work_id} not found")

        anomalies = repo.anomalies_for(work)
        signals = repo.signals_for([a.id for a in anomalies])
        decision = repo.latest_decision(work)

        return DossierOut(
            work=_work_out(work),
            anomalies=[
                _anomaly_out(a, signals.get(a.id, [])) for a in anomalies
            ],
            evidence=[
                EvidenceOut(
                    id=e.id,
                    work_id=e.work.id,
                    kind=e.kind,
                    name=e.name,
                    size_kb=e.size_kb,
                    uploaded_at=e.uploaded_at,
                    by=e.by,
                )
                for e in repo.evidences_for(work)
            ],
            activity=[
                ActivityOut(
                    id=f"T-{t.id}",
                    work_id=t.work.id,
                    at=t.at,
                    actor=t.actor,
                    action=t.action,
                    note=t.note,
                )
                for t in repo.activities_for(work)
            ],
            decision=(
                DecisionOut(
                    id=str(decision.id),
                    work_id=work.id,
                    status=decision.status,
                    note=decision.note,
                    at=decision.at,
                    by=decision.by,
                )
                if decision
                else None
            ),
        )


@orm.db_session
def _peer_comparison_impl(work_id: str, claims: OfficerClaims, today: date) -> PeersOut:
    """DB read + assembly; returns a Pydantic model (safe to memoize), never entities."""
    work = repo.get_scoped(work_id, claims)
    if work is None:
        raise NotFoundError(f"Work {work_id} not found")
    peers = repo.peer_group(work)
    if not peers:
        raise NotFoundError(f"No peer group for {work_id}")
    members = sorted(peers, key=lambda p: p.id)[:20]
    return PeersOut(
        work_id=work.id,
        peer_n=len(peers),
        rows=[
            PeerRowOut(
                metric="expenditure",
                work_value=int(work.expenditure_rs),
                peer_median=int(median(int(p.expenditure_rs) for p in peers)),
            ),
            PeerRowOut(
                metric="progress",
                work_value=float(work.progress_pct),
                peer_median=median(p.progress_pct for p in peers),
            ),
            PeerRowOut(
                metric="stallDays",
                work_value=float(stall_days(work.last_update, today)),
                peer_median=one_decimal(
                    median(stall_days(p.last_update, today) for p in peers)
                ),
            ),
        ],
        members=[
            PeerMemberOut(id=p.id, title=p.title, sanctioned_rs=int(p.sanctioned_rs))
            for p in members
        ],
    )


# Applied ONCE at import — a cache built per-call would never hit.
# OfficerClaims is a frozen dataclass (hashable) and scope is in the key,
# so different roles never share entries (analytics-cache.md §4.2).
@cached(ttl=300)
def _peer_comparison(work_id: str, claims: OfficerClaims, today: date) -> PeersOut:
    return _peer_comparison_impl(work_id, claims, today)


def peer_comparison(claims: OfficerClaims, work_id: str) -> PeersOut:
    return _peer_comparison(work_id, claims, get_settings().demo_today)
