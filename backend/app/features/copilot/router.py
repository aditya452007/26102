"""Copilot routes — the four deterministic tools (no LLM; ADR-025 leaves chat open).

compare/explain are aliases of the works/anomalies endpoints (kept for tool-name
clarity); they call the SAME services, so a tool answer and a screen answer
cannot diverge.
"""

from typing import Annotated

from fastapi import APIRouter, Query

from app.common.schemas import Page
from app.core.deps import CurrentOfficer
from app.features.anomalies import service as anomalies_service
from app.features.anomalies.schemas import AnomalyDetailOut
from app.features.copilot import service
from app.features.copilot.schemas import MissingOut
from app.features.works.schemas import PeersOut, WorkRowOut

router = APIRouter(prefix="/copilot", tags=["copilot"])


@router.get("/search", response_model=Page[WorkRowOut])
def search(
    officer: CurrentOfficer,
    q: Annotated[str | None, Query()] = None,
    scope: Annotated[str, Query(pattern="^(auto|all)$")] = "auto",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(alias="pageSize", ge=1, le=100)] = 10,
):
    """searchWorks tool (scope=auto applies the officer's scope)."""
    return service.search(officer, q, page, page_size)


@router.get("/compare/{work_id}", response_model=PeersOut)
def compare(work_id: str, officer: CurrentOfficer):
    """comparePeers tool — alias of GET /works/{work_id}/peers."""
    from app.features.works import service as works_service

    return works_service.peer_comparison(officer, work_id)


@router.get("/explain/{anomaly_id}", response_model=AnomalyDetailOut)
def explain(anomaly_id: str, officer: CurrentOfficer):
    """explainFlag tool — alias of GET /anomalies/{anomaly_id}."""
    return anomalies_service.explain(officer, anomaly_id)


@router.get("/missing/{work_id}", response_model=MissingOut)
def missing(work_id: str, officer: CurrentOfficer):
    """Derived data gaps for a work (UC pending, no recent measurement)."""
    return service.missing(officer, work_id)
