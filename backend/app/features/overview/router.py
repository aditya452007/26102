"""Overview routes (api-reference.md §overview)."""

from typing import Annotated

from fastapi import APIRouter, Query

from app.common.schemas import ItemsOut
from app.core.deps import CurrentOfficer
from app.features.overview import service
from app.features.overview.schemas import GeoRowOut, KpiOut
from app.features.works.schemas import WorkRowOut

router = APIRouter(prefix="/overview", tags=["overview"])


@router.get("/kpis", response_model=KpiOut)
def kpis():
    """Scheme-snapshot KPIs (static constants until real ingest; scope-agnostic)."""
    return service.kpis()


@router.get("/geo", response_model=ItemsOut[GeoRowOut])
def geo(officer: CurrentOfficer):
    return service.geo(officer)


@router.get("/queue", response_model=ItemsOut[WorkRowOut])
def queue(officer: CurrentOfficer, limit: Annotated[int, Query(ge=1, le=50)] = 8):
    return service.queue(officer, limit)
