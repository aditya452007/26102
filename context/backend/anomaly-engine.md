# Anomaly Engine — Rule-Based Detectors (rules-1.0)

> The analytics core. Five transparent, rule-based detectors — no ML — producing the exact
> `Anomaly` shape the frontend renders (`anomalySchema`). Every flag MUST carry: `peerN ≥ 8`,
> a human-readable `headline`, `corroboration` text, and ≥ 1 `signals` entry. This is the
> project's "explain every alert" law (invariant 5 in architecture.md).
>
> Implementation home: `app/services/detectors.py`. Runs at ingest and on
> `POST /detectors/recompute`. Each rule documents: trigger, formula, severity bands, the
> exact headline/corroboration/signal text, and the peer stats it writes.

## Shared definitions

- **Peer group** of a work: all works with the same `type` AND same `state`, excluding the work
  itself. (This reproduces the demo's `peerN: 18` for W-1014 and is the definition used
  everywhere — do not "improve" to district-level without a new ADR.)
- `median(X)` = standard median of the peer group's values.
- `stallDays(work)` = `DEMO_TODAY − last_update` in calendar days.
- `overrunRatio(work)` = `sanctioned_rs / median(peer sanctioned_rs)` (unit-invariant ratio).
- `DEMO_TODAY` = config `DEMO_TODAY_ISO` (2026-09-07) until real ingest.
- Severity rank order for recompute id numbering: `high` → `medium` → `low`, then work id.
- `detector_inputs` (JSONB) records each rule's raw inputs for audit, e.g.
  `{"ratio": 2.435, "peer_median": 7800000, "peer_n": 18, "threshold": 1.5}`.

## Rule 1 — Cost outlier (`kind: "cost"`)

**Trigger**: work is not `sanctioned` status (no spending signal yet) AND peer group size ≥ 8.

**Formula**:
```
ratio = sanctioned_rs / median(peer sanctioned_rs)
high   if ratio ≥ 2.0
medium if 1.4 ≤ ratio < 2.0
```

**Outputs** (mirror `buildAnomaly` cost branch exactly):
- `peerMedianRs` = `round10k(median)`, `actualRs` = `sanctioned_rs`
- headline: `Sanctioned cost above peer median — needs review`
- corroboration: `Single-estimate sanction with limited comparative quotes corroborates the variance.`
- signals:
  1. `Peer comparison` → adaptive `formatMoneyRs` sentence (e.g. `₹1.90 Cr vs ₹78.0L median across {N} similar {type} works in {district}`)
  2. `Corroborating signal` → `Estimate variance beyond peer band`

**Flagship override (seed data only)**: W-1014 pins `headline` to
`Sanctioned cost 2.4× peer median with a 96d stall — needs review`, `peerMedianRs = 7800000`,
corroboration `Single-estimate sanction plus a 96-day stall corroborates the cost variance.`,
and signal 2 value `96d stall — last update 96d ago`. The parity test asserts these strings.

## Rule 2 — Delay / stall (`kind: "delay"`)

**Trigger**: `stallDays ≥ 90` (the review threshold). Independent of status; stalled works and
silent in-execution works both qualify.

**Formula**:
```
days = DEMO_TODAY − last_update
high   if days ≥ 120
medium if 90 ≤ days < 120
```

**Outputs** (exact):
- `peerMedianRs = null`, `actualRs = null` (contract: money comparison not meaningful here)
- headline: `No progress update in {days}d — needs review`
- corroboration: `Last field update was {days}d ago against a {dueDate formatted "d MMM yyyy"} due date.`
- signals:
  1. `Stall duration` → `{days}d without update (review threshold 90d)`
  2. `Due date` → `{dueDate} at {progressPct}% progress`

## Rule 3 — Near-duplicate (`kind: "duplicate"`)

**Trigger**: another work exists with same `district` AND same `type` (the demo's matching
semantics). v1 deliberately keeps this coarse; a future geo-extent check needs a new ADR.

**Formula**:
```
twin = any other work with same (district, type)
severity = high (always — twin candidates are inherently review-worthy)
```

**Outputs** (exact):
- `peerMedianRs = null`, `actualRs = sanctioned_rs`
- headline: `Possible overlapping scope with a nearby {type} work — needs review`
- corroboration (twin found): `Same type and district as {twin.id} ({twin.title}); site extents need a joint review.`
- corroboration (no twin text): `Same type and district as another sanctioned work; site extents need a joint review.`
- signals:
  1. `Near-duplicate` → `{twin.id} — {twin.title} in {twin.district}` (or `Matched on type + district + sanction window`)
  2. `Sanctioned cost` → adaptive `formatMoneyRs(sanctioned_rs)`

## Rule 4 — Expenditure pattern (`kind: "expenditure"`)

**Trigger**: front-loaded spending — money released far ahead of physical progress. Uses the
peer's expenditure median as the reference.

**Formula**:
```
ratio = expenditure_rs / median(peer expenditure_rs)
high   if ratio ≥ 1.6
medium if 1.2 ≤ ratio < 1.6
```
Additional guard: only flag if `progress_pct ≤ 60` (spending fast while physically behind is
the suspicious pattern; a 95%-done work naturally has high cumulative spend).

**Outputs** (exact):
- `peerMedianRs` = `round10k(expenditure_rs / ratio)`, `actualRs` = `expenditure_rs`
- headline: `Front-loaded spending pattern — needs review`
- corroboration: `Released {formatMoneyRs(expenditure_rs)} against {progressPct}% physical progress.`
- signals:
  1. `Peer comparison` → compare sentence with expenditure values
  2. `Progress vs spend` → `{progressPct}% progress at {formatMoneyRs(expenditure_rs)} released`

## Rule 5 — Low utilisation / UC pending (`kind: "utilisation"`)

**Trigger**: funds released are low relative to sanction AND peers, with UC not attached.

**Formula**:
```
ratio        = expenditure_rs / sanctioned_rs
peer_ratio   = median(peer expenditure_rs / peer sanctioned_rs)
low utilisation if ratio < 0.6 × peer_ratio   (guard: sanctioned_rs ≥ ₹10L to skip tiny works)
```

**Outputs** (exact):
- `peerMedianRs` = `round10k(sanctioned_rs × (0.55..0.75 band from peer distribution))`,
  `actualRs` = `expenditure_rs`
- headline: `Low fund utilisation with utilisation certificate pending — needs review`
- corroboration: `Utilisation certificate for the last released tranche is still awaited from the agency.`
- signals:
  1. `Peer comparison` → compare sentence with expenditure values
  2. `Certificate status` → `UC pending for last tranche`

## Detector service semantics

1. Load all works in scope of the run (full table for ingest/recompute).
2. Compute peer medians once per `(type, state)` group (single SQL group-by, reused by all rules).
3. Evaluate rules per work; a work may receive **multiple** anomalies (W-1014 has cost + delay).
4. Deduplicate: one anomaly per `(work_id, kind)` — if two rules would both write `delay`, keep
   the higher severity.
5. Order: severity (high→medium→low), then `work_id`; assign ids `A-1..A-n`.
6. Replace: transaction deletes previous `detector_version` rows + signals, inserts new ones,
   stamps `detector_version = "rules-1.0"` and `detected_at = now()`.
7. Activity: append one `Flag raised — needs review` activity row per NEW flag (work_id + kind
   not previously flagged) with `actor = "NIRIKSHAN engine"` and `note = headline` — matching
   the seeded activity stream.

## Non-goals (v1)

- ML models, embeddings, learned thresholds (explicitly out per user decision).
- Text similarity for duplicates (fuzzy titles) — needs an ADR; v1 is type+district.
- Time-series expenditure curves — real eSAKSHI tranche data doesn't exist in the demo schema.
- Email/SMS dispatch of alerts — the notification feed is pull-based only.
