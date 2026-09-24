"""Overview wire schemas (api-reference.md §overview)."""

from app.common.schemas import CamelModel


class KpiOut(CamelModel):
    total_works: int
    under_execution: int
    delayed: int
    high_risk: int
    overrun_exposure_rs: int


class GeoRowOut(CamelModel):
    state: str
    works: int
    high: int
    delayed: int
    stalled: int
