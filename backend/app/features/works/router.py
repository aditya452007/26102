"""Works routes (Feature_docs/03-works + 04-work-dossier backend specs).

Paths are written in full (no router prefix) so the ledger route is exactly
`/api/v1/works` with no trailing-slash ambiguity.
"""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.common.schemas import Page
from app.core.deps import CurrentOfficer
from app.features.works import service
from app.features.works.schemas import DossierOut, PeersOut, WorkFilters, WorkOut, WorkRowOut

router = APIRouter(tags=["works"])


@router.get("/works", response_model=Page[WorkRowOut])
def list_works(
    f: Annotated[WorkFilters, Depends()],
    officer: CurrentOfficer,
):
    """Filterable, sortable, paginated ledger — mirrors the frontend URL state."""
    return service.list_works(officer, f)


@router.get("/works/{work_id}", response_model=WorkOut)
def get_work(work_id: str, officer: CurrentOfficer):
    return service.get_work(officer, work_id)


@router.get("/works/{work_id}/dossier", response_model=DossierOut)
def get_dossier(work_id: str, officer: CurrentOfficer):
    """The one-call dossier bundle — what dossier-data.ts assembles today."""
    return service.get_dossier(officer, work_id)


@router.get("/works/{work_id}/peers", response_model=PeersOut)
def get_peers(work_id: str, officer: CurrentOfficer):
    """Peer compare table (the comparePeers copilot tool)."""
    return service.peer_comparison(officer, work_id)
