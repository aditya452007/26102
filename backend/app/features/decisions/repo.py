"""Decision queries — create is transactional with its activity append.

The decision + its "Decision recorded" activity row MUST commit together
(Feature_docs/04 backend spec): the repo does both inside the caller's session.
"""

from pony import orm

from app.core.db import Activity, Work, WorkDecision


def latest(work: Work) -> WorkDecision | None:
    return (
        WorkDecision.select(lambda d: d.work.id == work.id)
        .order_by(orm.desc(WorkDecision.at))
        .first()
    )


def create_with_activity(work: Work, status: str, note: str, by: str) -> WorkDecision:
    decision = WorkDecision(work=work, status=status, note=note, by=by)
    Activity(
        work=work,
        actor=by,
        action=f"Decision recorded — {status}",
        note=note or None,  # contract: note omitted when empty
    )
    # Auto PKs (decision.id, decision.at, activity.id) are assigned at INSERT;
    # flush now so serializers read real values without committing early —
    # decision + activity still commit (or roll back) atomically together.
    # (Live-verification bug: serialized "id": "None" without this.)
    orm.flush()
    return decision
