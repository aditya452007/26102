"""Decisions route (Feature_docs/04 backend spec)."""

from typing import Annotated

from fastapi import APIRouter

from app.common.schemas import ItemsOut
from app.core.deps import CurrentOfficer
from app.features.decisions import service
from app.features.decisions.schemas import ActivityOut, DecisionIn, DecisionOut

router = APIRouter(tags=["decisions"])


@router.get("/works/{work_id}/activity", response_model=ItemsOut[ActivityOut])
def list_activity(work_id: str, officer: CurrentOfficer):
    """The work's activity feed, `at` DESC (api-reference.md §decisions)."""
    return service.list_activity(officer, work_id)


@router.post("/works/{work_id}/decision", response_model=DecisionOut, status_code=201)
def record_decision(
    work_id: str,
    payload: DecisionIn,
    officer: CurrentOfficer,
):
    """Record a decision; its activity row commits in the same transaction."""
    return service.record(officer, work_id, payload.status, payload.note)
