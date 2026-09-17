"""Insert the demo dataset into Postgres (seed-generator.md §9).

CLI: `uv run python -m app.seed.insert` — gated by SEED_DEMO:
  "true"  → insert when works table is empty (idempotent default)
  "force" → truncate demo tables first, then insert
  "false" → do nothing

Officers get bcrypt-hashed passwords here; everything else maps 1:1 from
`build_demo_dataset()` dicts (camelCase) to entities (snake_case).
"""

from datetime import datetime
from decimal import Decimal

import bcrypt
from pony import orm

from app.core.config import get_settings
from app.core.db import (
    Activity,
    Anomaly,
    AnomalySignal,
    Evidence,
    Officer,
    Work,
    WorkDecision,
    bind_database,
    db,
)
from app.seed.generate import build_demo_dataset

DETECTOR_VERSION_SEED = "rules-1.0-seed"


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _dec(value: float | int | None) -> Decimal | None:
    return None if value is None else Decimal(str(value))


def _clean(kwargs: dict) -> dict:
    """Drop None values — Pony Optional attrs default to None; explicit None kwargs
    are rejected by this Pony version, so optional values are simply omitted."""
    return {k: v for k, v in kwargs.items() if v is not None}


def _ts(uploaded_at: str) -> datetime:
    return datetime.strptime(uploaded_at, "%Y-%m-%dT%H:%M:%S.%fZ")


def _truncate_demo_tables() -> None:
    # Officers are NOT truncated: they are configuration, not demo data —
    # re-creating them would rotate UUIDs and invalidate outstanding JWTs.
    orm.delete(s for s in AnomalySignal)
    orm.delete(a for a in Anomaly)
    orm.delete(t for t in Activity)
    orm.delete(e for e in Evidence)
    orm.delete(d for d in WorkDecision)
    orm.delete(w for w in Work)


def insert_demo_data(force: bool = False) -> int:
    """Insert the full demo dataset; returns works count.

    This function OWNS its transactions — callers must NOT wrap it in another
    `db_session` (Pony nests sessions into one transaction, and delete+create
    of the same PKs inside one transaction trips its cache index). Truncate
    and insert are separate transactions; not atomic across the two, which is
    acceptable for a dev/test seed path.
    """
    data = build_demo_dataset()

    if force:
        with orm.db_session:
            _truncate_demo_tables()
    else:
        with orm.db_session:
            existing = orm.count(w for w in Work)
            if existing > 0:
                return existing

    # The insert transaction — opened HERE, not by callers (Pony nests nested
    # sessions into one transaction; delete+create of the same PKs in a single
    # transaction trips its cache index).
    with orm.db_session:
        return _insert_all(data)


def _insert_all(data: dict) -> int:
    """Insert everything; runs inside the session opened by insert_demo_data."""
    works_by_id: dict[str, Work] = {}
    for w in data["works"]:
        works_by_id[w["id"]] = Work(
            id=w["id"],
            title=w["title"],
            type=w["type"],
            state=w["state"],
            district=w["district"],
            agency=w["agency"],
            status=w["status"],
            sanctioned_lakh=_dec(w["sanctionedLakh"]),
            expenditure_lakh=_dec(w["expenditureLakh"]),
            progress_pct=w["progressPct"],
            sanction_date=datetime.strptime(w["sanctionDate"], "%Y-%m-%d").date(),
            due_date=datetime.strptime(w["dueDate"], "%Y-%m-%d").date(),
            last_update=datetime.strptime(w["lastUpdate"], "%Y-%m-%d").date(),
            lat=_dec(w["lat"]),
            lon=_dec(w["lon"]),
            tender_holder=w["tenderHolder"],
            tender_awarded_by=w["tenderAwardedBy"],
            department=w["department"],
            labour_deployed=w["labourDeployed"],
            demanded_days=w["demandedDays"],
            returned_lakh=_dec(w["returnedLakh"]),
        )

    for a in data["anomalies"]:
        anomaly = Anomaly(
            **_clean({
                "id": a["id"],
                "work": works_by_id[a["workId"]],
                "kind": a["kind"],
                "severity": a["severity"],
                "headline": a["headline"],
                "peer_n": a["peerN"],
                "peer_median_lakh": _dec(a["peerMedianLakh"]),
                "actual_lakh": _dec(a["actualLakh"]),
                "unit": a["unit"],
                "corroboration": a["corroboration"],
                "detector_version": DETECTOR_VERSION_SEED,
                # seed flags come from the TS mock, not a detector run:
                "detector_inputs": {},
            })
        )
        for pos, s in enumerate(a["signals"]):
            AnomalySignal(anomaly=anomaly, label=s["label"], value=s["value"], position=pos)

    for e in data["evidences"]:
        Evidence(
            **_clean({
                "id": e["id"],
                "work": works_by_id[e["workId"]],
                "kind": e["kind"],
                "name": e["name"],
                "size_kb": e["sizeKb"],
                "storage_path": None,  # demo seed rows have no stored file
                "uploaded_at": _ts(e["uploadedAt"]),
                "by": e["by"],
            })
        )

    for t in data["activities"]:
        Activity(
            **_clean({
                "work": works_by_id[t["workId"]],
                "at": _ts(t["at"]),
                "actor": t["actor"],
                "action": t["action"],
                "note": t.get("note"),
            })
        )

    for o in data["officers"]:
        # Upsert by email: stable UUIDs (JWT subs survive reseeds), idempotent reruns.
        officer = Officer.get(email=o["email"])
        if officer is None:
            Officer(
                **_clean({
                    "email": o["email"],
                    "password_hash": hash_password(o["password"]),
                    "full_name": o["full_name"],
                    "role": o["role"],
                    "state_scope": o["stateScope"],
                    "district_scope": o["districtScope"],
                })
            )
        else:
            officer.password_hash = hash_password(o["password"])
            officer.full_name = o["full_name"]
            officer.role = o["role"]
            officer.state_scope = o["stateScope"]
            officer.district_scope = o["districtScope"]

    return len(data["works"])


def main() -> None:
    settings = get_settings()
    if settings.seed_demo.lower() == "false":
        print("SEED_DEMO=false — skipping")
        return
    bind_database()
    # insert_demo_data owns its transactions — do NOT wrap it in db_session.
    count = insert_demo_data(force=settings.seed_demo.lower() == "force")
    print(f"seeded demo dataset ({count} works)")


if __name__ == "__main__":
    main()
