"""Evidence routes (Feature_docs/04 backend spec).

GET  /works/{work_id}/evidence        → scoped list
POST /works/{work_id}/evidence        → multipart upload (201)
GET  /evidence/{evidence_id}/file     → stream stored bytes (404 for seed rows)
"""

from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import Response

from app.common.schemas import ItemsOut
from app.core.deps import CurrentOfficer
from app.features.evidence import service
from app.features.evidence.schemas import EvidenceOut

router = APIRouter(tags=["evidence"])


@router.get("/works/{work_id}/evidence", response_model=ItemsOut[EvidenceOut])
def list_evidence(work_id: str, officer: CurrentOfficer):
    items = service.list_for_work(officer, work_id)
    return ItemsOut[EvidenceOut](items=items, total=len(items))


@router.post("/works/{work_id}/evidence", response_model=EvidenceOut, status_code=201)
def upload_evidence(
    work_id: str,
    officer: CurrentOfficer,
    file: Annotated[UploadFile, File()],
    kind: Annotated[str, Form(pattern="^(doc|photo|report)$")],
):
    """Multipart upload: `file` + `kind` (doc|photo|report). Allowlist + size cap."""
    return service.upload(officer, work_id, file, kind)


@router.get("/evidence/{evidence_id}/file")
def download_evidence(evidence_id: str, officer: CurrentOfficer):
    name, data = service.download(officer, evidence_id)
    safe_name = name.replace('"', "")  # header-safe filename
    return Response(
        content=data,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )
