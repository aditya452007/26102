"""Decisions service — record a decision (scope-checked), append activity same-tx."""

from pony import orm

from app.common.errors import NotFoundError, ScopeForbiddenError
from app.common.schemas import ItemsOut
from app.core.security import OfficerClaims
from app.features.auth import repo as officer_repo
from app.features.decisions import repo
from app.features.decisions.schemas import ActivityOut, DecisionOut
from app.features.works import repo as works_repo


def record(claims: OfficerClaims, work_id: str, status: str, note: str) -> DecisionOut:
    """Decision + its activity row commit together (Feature_docs/04 spec)."""
    with orm.db_session:
        # Write flow: unknown → 404, out-of-scope → 403 (RBAC law).
        work = works_repo.get_any(work_id)
        if work is None:
            raise NotFoundError(f"Work {work_id} not found")
        if not works_repo.in_scope(work, claims):
            raise ScopeForbiddenError(f"Work {work_id} is outside your scope")
        officer = officer_repo.find_by_id(claims.id)
        by = officer.full_name if officer else claims.email
        decision = repo.create_with_activity(work, status, note, by)
        return DecisionOut(
            id=str(decision.id),
            work_id=work.id,
            status=decision.status,
            note=decision.note,
            at=decision.at,
            by=decision.by,
        )


def list_activity(claims: OfficerClaims, work_id: str) -> ItemsOut[ActivityOut]:
    """The work's activity feed, `at` DESC — shares the repo fn with the dossier."""
    with orm.db_session:
        work = works_repo.get_scoped(work_id, claims)
        if work is None:
            raise NotFoundError(f"Work {work_id} not found")
        items = [
            ActivityOut(
                id=f"T-{t.id}",
                work_id=t.work.id,
                at=t.at,
                actor=t.actor,
                action=t.action,
                note=t.note,
            )
            for t in works_repo.activities_for(work)
        ]
    return ItemsOut[ActivityOut](items=items, total=len(items))
