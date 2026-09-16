"""Notifications service — exact port of `buildNotifications` (data.ts derivation).

For every high anomaly → `high-risk`; every utilisation anomaly → `uc`; every
stalled work → `stall`; every non-completed work past due → `overdue`.
Sort: kind rank (high-risk → stall → uc → overdue) then ageDays DESC.
Cached per officer scope (scoping happens before caching — analytics-cache §4.2).
"""

from datetime import date

from pony import orm

from app.common.caching import cached
from app.common.schemas import ItemsOut
from app.core.config import get_settings
from app.core.security import OfficerClaims
from app.features.anomalies import repo as anomalies_repo
from app.features.notifications.schemas import NotificationOut
from app.features.works import repo as works_repo

KIND_RANK = {"high-risk": 0, "stall": 1, "uc": 2, "overdue": 3}


@orm.db_session
def _build_impl(claims: OfficerClaims, today: date) -> list[NotificationOut]:
    anomalies = anomalies_repo.all_scoped(claims)
    works = works_repo.all_scoped(claims)
    by_id = {w.id: w for w in works}

    def days_since(day) -> int:
        return (today - day).days

    rows: list[NotificationOut] = []
    for a in anomalies:
        work = by_id.get(a.work.id)
        if work is None:
            continue  # defensive: anomaly whose work fell out of scope
        if a.severity == "high":
            rows.append(NotificationOut(
                id=f"N-high-{work.id}", kind="high-risk",
                title=f"{work.id} flagged {a.kind} — high priority",
                description=a.headline, work_id=work.id,
                age_days=days_since(work.last_update),
            ))
        if a.kind == "utilisation":
            rows.append(NotificationOut(
                id=f"N-uc-{work.id}", kind="uc",
                title=f"{work.id} utilisation certificate pending",
                description="Next tranche is blocked until the UC for the last release is attached.",
                work_id=work.id,
                age_days=days_since(work.last_update),
            ))

    for w in works:
        if w.status == "stalled":
            rows.append(NotificationOut(
                id=f"N-stall-{w.id}", kind="stall",
                title=f"{w.id} stalled — no field update in {days_since(w.last_update)}d",
                description=f"{w.title} in {w.district} is past the 90-day review threshold.",
                work_id=w.id,
                age_days=days_since(w.last_update),
            ))
        elif w.status != "completed" and w.due_date < today:
            rows.append(NotificationOut(
                id=f"N-overdue-{w.id}", kind="overdue",
                title=f"{w.id} past due date",
                description=f"Due {w.due_date.isoformat()} at {w.progress_pct}% progress — needs review.",
                work_id=w.id,
                age_days=days_since(w.due_date),
            ))

    rows.sort(key=lambda r: (KIND_RANK[r.kind], -r.age_days))
    return rows


# Applied ONCE at import; OfficerClaims is a frozen dataclass (hashable) and is
# part of the key → cross-role leakage impossible.
@cached(ttl=300)
def _build_cached(claims: OfficerClaims, today: date) -> list[NotificationOut]:
    return _build_impl(claims, today)


def feed(claims: OfficerClaims) -> ItemsOut[NotificationOut]:
    items = _build_cached(claims, get_settings().demo_today)
    return ItemsOut[NotificationOut](items=items, total=len(items))
