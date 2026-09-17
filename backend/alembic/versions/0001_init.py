"""0001_init — all seven tables per data-model.md.

Hand-written SQL (no autogenerate — Pony entities). Money is NUMERIC(12,2) in
lakhs; coords NUMERIC(8,5); enums are TEXT + CHECK (Pydantic re-validates at
the boundary; DB CHECKs are the last line of defense).
"""

from alembic import context, op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

UPGRADE_SQL = """
CREATE TABLE officers (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    full_name      TEXT NOT NULL,
    role           TEXT NOT NULL CHECK (role IN ('district', 'state', 'ministry')),
    state_scope    TEXT,
    district_scope TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE works (
    id                TEXT PRIMARY KEY CHECK (id ~ '^W-[0-9]{4}$'),
    title             TEXT NOT NULL,
    type              TEXT NOT NULL CHECK (type IN
        ('road', 'community-hall', 'water', 'school', 'drainage', 'streetlight')),
    state             TEXT NOT NULL,
    district          TEXT NOT NULL,
    agency            TEXT NOT NULL,
    status            TEXT NOT NULL CHECK (status IN
        ('in-execution', 'completed', 'sanctioned', 'stalled')),
    sanctioned_lakh   NUMERIC(12,2) NOT NULL CHECK (sanctioned_lakh >= 0),
    expenditure_lakh  NUMERIC(12,2) NOT NULL CHECK (expenditure_lakh >= 0),
    progress_pct      SMALLINT NOT NULL CHECK (progress_pct BETWEEN 0 AND 100),
    sanction_date     DATE NOT NULL,
    due_date          DATE NOT NULL,
    last_update       DATE NOT NULL,
    lat               NUMERIC(8,5),
    lon               NUMERIC(8,5),
    tender_holder     TEXT NOT NULL,
    tender_awarded_by TEXT NOT NULL,
    department        TEXT NOT NULL,
    labour_deployed   INTEGER NOT NULL CHECK (labour_deployed >= 0),
    demanded_days     INTEGER NOT NULL CHECK (demanded_days >= 1),
    returned_lakh     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (returned_lakh >= 0),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_works_state_district ON works (state, district);
CREATE INDEX ix_works_status         ON works (status);
CREATE INDEX ix_works_type           ON works (type);
CREATE INDEX ix_works_last_update    ON works (last_update);
CREATE INDEX ix_works_due_date       ON works (due_date);

CREATE TABLE anomalies (
    id               TEXT PRIMARY KEY,
    work_id          TEXT NOT NULL REFERENCES works (id) ON DELETE CASCADE,
    kind             TEXT NOT NULL CHECK (kind IN
        ('cost', 'expenditure', 'delay', 'duplicate', 'utilisation')),
    severity         TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
    headline         TEXT NOT NULL,
    peer_n           INTEGER NOT NULL CHECK (peer_n >= 8),
    peer_median_lakh NUMERIC(12,2),
    actual_lakh      NUMERIC(12,2),
    unit             TEXT NOT NULL DEFAULT '₹L',
    corroboration    TEXT NOT NULL,
    detector_version TEXT NOT NULL,
    detector_inputs  JSONB NOT NULL DEFAULT '{}'::jsonb,
    detected_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_anomalies_work_id  ON anomalies (work_id);
CREATE INDEX ix_anomalies_severity ON anomalies (severity);
CREATE INDEX ix_anomalies_kind     ON anomalies (kind);

CREATE TABLE anomaly_signals (
    id         BIGSERIAL PRIMARY KEY,
    anomaly_id TEXT NOT NULL REFERENCES anomalies (id) ON DELETE CASCADE,
    label      TEXT NOT NULL,
    value      TEXT NOT NULL,
    position   SMALLINT NOT NULL
);

CREATE TABLE evidences (
    id           TEXT PRIMARY KEY,
    work_id      TEXT NOT NULL REFERENCES works (id) ON DELETE CASCADE,
    kind         TEXT NOT NULL CHECK (kind IN ('doc', 'photo', 'report')),
    name         TEXT NOT NULL,
    size_kb      INTEGER NOT NULL CHECK (size_kb > 0),
    storage_path TEXT,
    uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    by           TEXT NOT NULL
);

CREATE INDEX ix_evidences_work_id ON evidences (work_id);

CREATE TABLE activities (
    id      BIGSERIAL PRIMARY KEY,
    work_id TEXT NOT NULL REFERENCES works (id) ON DELETE CASCADE,
    at      TIMESTAMPTZ NOT NULL,
    actor   TEXT NOT NULL,
    action  TEXT NOT NULL,
    note    TEXT
);

CREATE INDEX ix_activities_work_id_at ON activities (work_id, at DESC);

CREATE TABLE work_decisions (
    id      BIGSERIAL PRIMARY KEY,
    work_id TEXT NOT NULL REFERENCES works (id) ON DELETE CASCADE,
    status  TEXT NOT NULL CHECK (status IN ('verified', 'dismissed', 'action-required')),
    note    TEXT NOT NULL DEFAULT '',
    at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    by      TEXT NOT NULL
);

CREATE INDEX ix_decisions_work_id_at ON work_decisions (work_id, at DESC);
"""

DOWNGRADE_SQL = """
DROP TABLE IF EXISTS work_decisions;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS evidences;
DROP TABLE IF EXISTS anomaly_signals;
DROP TABLE IF EXISTS anomalies;
DROP TABLE IF EXISTS works;
DROP TABLE IF EXISTS officers;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
