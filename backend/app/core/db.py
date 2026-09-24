"""Pony ORM binding + all seven entities (data-model.md is the DDL source of truth).

One module, one `db` object: Pony requires every entity registered on the same
`Database()` before `generate_mapping()` (structure.md §entities). Entities are
the ONLY objects repos touch — services never see them.

Column naming matches Alembic migration 0001_init exactly; FK columns are named
explicitly (`column="work_id"`) because Pony's default is the attribute name.
All Optional attrs pass `nullable=True`: without it, Pony substitutes the type's
empty value ("" for strings) instead of NULL, which would corrupt the contract
(scope-less officers would read as scope="", nullable notes as empty notes).
Delete cascades live in the DDL (`ON DELETE CASCADE`) — not duplicated here, since
Pony forbids `cascade_delete` on both relationship sides.
"""

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from pony import orm
from pony.orm.core import Optional, PrimaryKey, Required, Set

from app.core.config import get_settings

db = orm.Database()


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Officer(db.Entity):
    _table_ = "officers"
    id = PrimaryKey(UUID, default=uuid4)
    email = Required(str, unique=True)
    password_hash = Required(str)
    full_name = Required(str)
    role = Required(str)  # district | state | ministry
    state_scope = Optional(str, nullable=True)
    district_scope = Optional(str, nullable=True)
    created_at = Required(datetime, default=_now)


class Work(db.Entity):
    _table_ = "works"
    id = PrimaryKey(str)  # "W-1014"
    title = Required(str)
    type = Required(str)
    state = Required(str)
    district = Required(str)
    agency = Required(str)
    status = Required(str)
    sanctioned_rs = Required(int, size=64)
    expenditure_rs = Required(int, size=64)
    progress_pct = Required(int)
    sanction_date = Required(date)
    due_date = Required(date)
    last_update = Required(date)
    lat = Optional(Decimal, nullable=True)
    lon = Optional(Decimal, nullable=True)
    tender_holder = Required(str)
    tender_awarded_by = Required(str)
    department = Required(str)
    labour_deployed = Required(int)
    demanded_days = Required(int)
    returned_rs = Required(int, size=64, default=0)
    created_at = Required(datetime, default=_now)
    updated_at = Required(datetime, default=_now)

    anomalies = Set("Anomaly")
    evidences = Set("Evidence")
    activities = Set("Activity")
    decisions = Set("WorkDecision")


class Anomaly(db.Entity):
    _table_ = "anomalies"
    id = PrimaryKey(str)  # "A-1"
    work = Required(Work, column="work_id")
    kind = Required(str)
    severity = Required(str)
    headline = Required(str)
    peer_n = Required(int)
    peer_median_rs = Optional(int, size=64, nullable=True)
    actual_rs = Optional(int, size=64, nullable=True)
    unit = Required(str, default="₹")
    corroboration = Required(str)
    detector_version = Required(str)
    detector_inputs = Required(orm.Json)  # JSONB audit trail
    detected_at = Required(datetime, default=_now)

    signals = Set("AnomalySignal")


class AnomalySignal(db.Entity):
    _table_ = "anomaly_signals"
    id = PrimaryKey(int, auto=True)
    anomaly = Required(Anomaly, column="anomaly_id")
    label = Required(str)
    value = Required(str)
    position = Required(int)


class Evidence(db.Entity):
    _table_ = "evidences"
    id = PrimaryKey(str)  # "E-1"
    work = Required(Work, column="work_id")
    kind = Required(str)  # doc | photo | report
    name = Required(str)
    size_kb = Required(int)
    storage_path = Optional(str, nullable=True)  # null for demo seed rows
    uploaded_at = Required(datetime, default=_now)
    by = Required(str)


class Activity(db.Entity):
    _table_ = "activities"
    id = PrimaryKey(int, auto=True)  # surfaced as "T-{n}"
    work = Required(Work, column="work_id")
    at = Required(datetime, default=_now)
    actor = Required(str)
    action = Required(str)
    note = Optional(str, nullable=True)


class WorkDecision(db.Entity):
    _table_ = "work_decisions"
    id = PrimaryKey(int, auto=True)
    work = Required(Work, column="work_id")
    status = Required(str)  # verified | dismissed | action-required
    note = Required(str)  # services always supply a value (may be "")
    at = Required(datetime, default=_now)
    by = Required(str)


def bind_database(dsn: str | None = None, create_tables: bool = False) -> None:
    """Bind the (process-global) Pony db once. `create_tables=True` is a dev/test
    shortcut; production schema comes from Alembic, never from the ORM."""
    if db.provider is None:
        db.bind(provider="postgres", dsn=dsn or get_settings().database_url)
        db.generate_mapping(create_tables=create_tables)
