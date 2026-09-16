"""Evidence wire schemas — `evidenceSchema` shape."""

from app.common.schemas import CamelModel, ZuluTs


class EvidenceOut(CamelModel):
    id: str
    work_id: str
    kind: str
    name: str
    size_kb: int
    uploaded_at: ZuluTs
    by: str
