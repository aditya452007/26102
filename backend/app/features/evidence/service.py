"""Evidence service — upload validation, storage, download (ssdlc file rules).

Allowlist extensions + size cap + random hex storage names under UPLOAD_DIR.
Storage names are never client-controlled; downloads stream with a safe
Content-Disposition; demo seed rows (storage_path NULL) download as 404.
"""

import secrets
from pathlib import Path

from pony import orm

from app.common.errors import NotFoundError, ScopeForbiddenError
from app.core.config import get_settings
from app.core.security import OfficerClaims
from app.features.auth import repo as officer_repo
from app.features.evidence import repo
from app.features.evidence.schemas import EvidenceOut
from app.features.works import repo as works_repo

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}


def _officer_name(claims: OfficerClaims) -> str:
    with orm.db_session:
        officer = officer_repo.find_by_id(claims.id)
        return officer.full_name if officer else claims.email


def _evidence_out(e) -> EvidenceOut:
    return EvidenceOut(
        id=e.id,
        work_id=e.work.id,
        kind=e.kind,
        name=e.name,
        size_kb=e.size_kb,
        uploaded_at=e.uploaded_at,
        by=e.by,
    )


def list_for_work(claims: OfficerClaims, work_id: str) -> list[EvidenceOut]:
    with orm.db_session:
        work = works_repo.get_scoped(work_id, claims)
        if work is None:
            raise NotFoundError(f"Work {work_id} not found")
        return [_evidence_out(e) for e in repo.evidences_for(work)]


def upload(claims: OfficerClaims, work_id: str, file, kind: str) -> EvidenceOut:
    """Validate → authorize → store → create. Order matters: nothing is written
    to disk before the request is fully authorized (no orphan cleanup needed)."""
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise ScopeForbiddenError(f"File type {suffix or '(none)'} not allowed")

    settings = get_settings()
    max_bytes = settings.upload_max_mb * 1024 * 1024
    data = file.file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise ScopeForbiddenError(f"File exceeds {settings.upload_max_mb} MB limit")

    with orm.db_session:
        # Write flows distinguish unknown (404) from out-of-scope (403).
        work = works_repo.get_any(work_id)
        if work is None:
            raise NotFoundError(f"Work {work_id} not found")
        if not works_repo.in_scope(work, claims):
            raise ScopeForbiddenError(f"Work {work_id} is outside your scope")

        storage_name = f"{secrets.token_hex(16)}{suffix}"
        storage_dir = Path(settings.upload_dir)
        storage_dir.mkdir(parents=True, exist_ok=True)
        (storage_dir / storage_name).write_bytes(data)

        by = _officer_name(claims)
        row = repo.create(
            work=work,
            kind=kind,
            name=file.filename or storage_name,
            size_kb=max(len(data) // 1024, 1),
            storage_path=str(storage_dir / storage_name),
            by=by,
        )
        return _evidence_out(row)


def download(claims: OfficerClaims, evidence_id: str) -> tuple[str, bytes]:
    """Returns (filename, bytes); 404 for unknown or seed rows (no stored file)."""
    with orm.db_session:
        e = repo.get(evidence_id)
        if e is None or e.storage_path is None:
            raise NotFoundError("Evidence file not available")
        work = works_repo.get_scoped(e.work.id, claims)
        if work is None:
            raise NotFoundError("Evidence file not available")
        path = Path(e.storage_path)
        if not path.exists():
            raise NotFoundError("Evidence file not available")
        return e.name, path.read_bytes()
