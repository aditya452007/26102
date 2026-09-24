"""0002_rupees — money columns NUMERIC(lakhs) → BIGINT(rupees).

eSAKSHI stores integer rupees; the demo followed in SPEC rev 2 (ADR-034).
Existing demo rows convert at ×100000 (0.1L precision → exact rupees);
the seed then force-refreshes with native rupee values anyway.
"""

from alembic import context, op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

UPGRADE_SQL = """
ALTER TABLE works
    ALTER COLUMN sanctioned_lakh TYPE BIGINT USING round(sanctioned_lakh * 100000)::bigint,
    ALTER COLUMN expenditure_lakh TYPE BIGINT USING round(expenditure_lakh * 100000)::bigint,
    ALTER COLUMN returned_lakh TYPE BIGINT USING round(returned_lakh * 100000)::bigint;
ALTER TABLE works
    RENAME COLUMN sanctioned_lakh TO sanctioned_rs;
ALTER TABLE works
    RENAME COLUMN expenditure_lakh TO expenditure_rs;
ALTER TABLE works
    RENAME COLUMN returned_lakh TO returned_rs;

ALTER TABLE anomalies
    ALTER COLUMN peer_median_lakh TYPE BIGINT USING round(peer_median_lakh * 100000)::bigint,
    ALTER COLUMN actual_lakh TYPE BIGINT USING round(actual_lakh * 100000)::bigint;
ALTER TABLE anomalies
    RENAME COLUMN peer_median_lakh TO peer_median_rs;
ALTER TABLE anomalies
    RENAME COLUMN actual_lakh TO actual_rs;
ALTER TABLE anomalies ALTER COLUMN unit SET DEFAULT '₹';
"""

DOWNGRADE_SQL = """
ALTER TABLE anomalies
    RENAME COLUMN actual_rs TO actual_lakh;
ALTER TABLE anomalies
    RENAME COLUMN peer_median_rs TO peer_median_lakh;
ALTER TABLE anomalies
    ALTER COLUMN peer_median_lakh TYPE NUMERIC(12,2) USING peer_median_lakh::numeric / 100000,
    ALTER COLUMN actual_lakh TYPE NUMERIC(12,2) USING actual_lakh::numeric / 100000;
ALTER TABLE anomalies ALTER COLUMN unit SET DEFAULT '₹L';

ALTER TABLE works
    RENAME COLUMN returned_rs TO returned_lakh;
ALTER TABLE works
    RENAME COLUMN expenditure_rs TO expenditure_lakh;
ALTER TABLE works
    RENAME COLUMN sanctioned_rs TO sanctioned_lakh;
ALTER TABLE works
    ALTER COLUMN sanctioned_lakh TYPE NUMERIC(12,2) USING sanctioned_lakh::numeric / 100000,
    ALTER COLUMN expenditure_lakh TYPE NUMERIC(12,2) USING expenditure_lakh::numeric / 100000,
    ALTER COLUMN returned_lakh TYPE NUMERIC(12,2) USING returned_lakh::numeric / 100000;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
