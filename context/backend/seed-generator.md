# Seed Generator — Python Port of `mplads-mock.ts`

> Goal: Postgres seeds the **same demo dataset** as the frontend's bundled mock, so the
> mock→real swap is invisible (user decision, 2026-09-14). This spec is the exact algorithm;
> `app/seed/rng.py` + `app/seed/generate.py` implement it, `tests/test_seed_parity.py` proves it.
>
> Source of truth: `admin-dashboard/src/lib/mplads-mock.ts` (520 lines). If that file changes,
> this spec and the Python port change with it (same commit, new ADR).

## 0. Streams — five independent mulberry32 streams

| Stream id | Seed | Consumed by |
|---|---|---|
| `main` | `26102` (MPLADS_SEED) | works: status shuffle, type/title/agency, amounts, dates, coords |
| `extra` | `26102 + 500 = 26602` | ADR-013 fields: department, labour, demandedDays, returnedLakh |
| `anomaly` | `26102 + 7 = 26109` | candidate shuffle before flag selection |
| `anomaly-index` | `26102 + index*101` (per flag) | per-anomaly internal draws (peerN, ratio jitter) |
| `evidence` | `26102 + 21 = 26123` | evidence sizes + upload ages |

**Cardinal rule**: every `rng()` call is load-bearing — a value depends on total call order
within its stream. One extra/missing draw shifts all downstream values. The parity test (§8)
is the alarm; never "tidy up" call order casually.

## 1. `mulberry32` — Python port (VERIFIED identical)

Verified headless 2026-09-14 against the TS original in Node: seeds 26102 and 26602, first 5
draws match to 10 decimals.

```python
_MASK32 = 0xFFFFFFFF

def mulberry32(seed: int):
    """Byte-identical port of mulberry32 (mplads-mock.ts). Seed is uint32."""
    a = seed & _MASK32

    def rng() -> float:
        nonlocal a
        a = (a + 0x6D2B79F5) & _MASK32
        t = ((a ^ (a >> 15)) * (1 | a)) & _MASK32
        t = (((t + (((t ^ (t >> 7)) * (61 | t)) & _MASK32)) & _MASK32) ^ t) & _MASK32
        return ((t ^ (t >> 14)) & _MASK32) / 4294967296.0

    return rng
```

Test vectors (assert in `tests/test_seed_parity.py`):
- seed `26102`: `0.1417788703, 0.7273318286, 0.5826761411, 0.3812258046, 0.3712489000`
- seed `26602`: `0.3361864095, 0.1342250074, 0.6942306196, 0.1894840100, 0.7805237325`

## 2. Works generation (40 works, ids W-1001..W-1040)

Constants (exact, from `mplads-mock.ts`):

```python
WORK_TYPES = ["road", "community-hall", "water", "school", "drainage", "streetlight"]
DEPARTMENTS = ["PWD", "Water Board", "Municipal Corp", "Rural Works"]
# (state, district, lat, lon) — order matters (round-robin assignment)
DISTRICTS = [
    ("Madhya Pradesh", "Bhopal", 23.26, 77.41),
    ("Madhya Pradesh", "Indore", 22.72, 75.86),
    ("Rajasthan", "Jaipur", 26.91, 75.79),
    ("Rajasthan", "Udaipur", 24.58, 73.68),
    ("Bihar", "Patna", 25.59, 85.14),
    ("Bihar", "Gaya", 24.79, 85.0),
    ("Odisha", "Cuttack", 20.46, 85.88),
    ("Odisha", "Sambalpur", 21.47, 83.97),
    ("Karnataka", "Bengaluru Urban", 12.97, 77.59),
    ("Karnataka", "Mysuru", 12.3, 76.65),
    ("Assam", "Kamrup", 26.18, 91.75),
    ("Assam", "Dibrugarh", 27.47, 94.91),
]
```

Generation order per the TS source:

1. `main` rng draws the status shuffle: Fisher-Yates `shuffled()` over the 39-work rest list
   (18 in-execution + 7 stalled + 7 completed + 7 sanctioned) — 38 internal draws, pre-loop.
2. Loop `n = 1001..1040` (`index = n − 1001`); `place = DISTRICTS[index % 12]`.
3. **W-1014 is flagship: every field pinned, zero rng** —
   `type=community-hall, status=stalled, title="Community Hall — Ward Block 7",
   agency=Contractor-07, sanctionedLakh=58.9, expenditureLakh=41.2, progressPct=62,
   sanctionDate=2024-11-20, dueDate=2025-10-15, lastUpdate=DEMO_TODAY−96d=2026-06-03,
   district=Bhopal, tenderHolder=Contractor-07, tenderAwardedBy="District Authority, Bhopal",
   department=PWD, labourDeployed=42, demandedDays=330, returnedLakh=0`.
   Only its `lat/lon` draw from `main`: `oneDecimal(23.26 + (rng()−0.5)*0.2)` then the same for
   lon from 77.41 (2 draws, in that order). State resolves via `place` (Madhya Pradesh).
4. Non-flagship works, in TS source order per work:
   - `type = WORK_TYPES[int(main, 0, 5)]`
   - `status = restStatuses[statusCursor++]` (no rng)
   - `title = titleFor(type, int(main, 1, 24))`
   - `agency = agencyFor(main)` — `if main() < 0.5: Contractor-{int(main,1,12):02d} else Agency-East-{int(main,1,4)}`
   - `sanctionedLakh = oneDecimal(4 + main()*86)`
   - `progressPct = progressFor(main, status)` — completed→100; sanctioned→int(0,5); in-execution→int(15,85); stalled→int(10,70)
   - `expenditureLakh = oneDecimal(sanctionedLakh * spendRatioFor(main, status))` — completed→0.95+main()*0.05; sanctioned→main()*0.1; else→0.2+main()*0.65
   - `sanctionDate = 2023-04-01 + int(main, 0, 820) days`
   - `dueDate = sanctionDate + (270 + int(main, 0, 270)) days`
   - `lastUpdate = lastUpdateFor(main, status)` — stalled→DEMO_TODAY−int(91,180)d; in-execution→−int(2,30)d; else→−int(5,120)d
   - `tenderAwardedBy = f"District Authority, {district}"`, `tenderHolder = agency` (no rng)
   - `extra` stream, in order: `department = DEPARTMENTS[int(extra, 0, 3)]`,
     `labourDeployed = int(extra, 8, 60)`, `demandedDays = int(extra, 180, 540)`,
     then the returned gate: `if extra() >= 0.7:` →
     `returnedLakh = oneDecimal(min(extra() * min(5, sanctionedLakh * 0.15), headroom))`
     where `headroom = max(sanctionedLakh − expenditureLakh, 0)`; else `returnedLakh = 0`
   - `lat = oneDecimal(place.lat + (main()−0.5)*0.2)`, `lon = oneDecimal(place.lon + (main()−0.5)*0.2)`

Helpers (exact ports):
- `int(rng, min, max)` = `min + floor(rng() * (max − min + 1))`
- `oneDecimal(x)` = TS `Math.round(x*10)/10` — **half-up**; do NOT use Python `round()` (banker's
  rounding). Use `floor(x*10 + 0.5) / 10` (all values here are non-negative).
- `shuffled(rng, items)` = Fisher-Yates exactly as TS: copy list, for i from len−1 down to 1:
  `j = floor(rng() * (i+1))`, swap. Never `random.shuffle`.
- Date math: day granularity only; `DEMO_TODAY = date(2026, 9, 7)`; format `yyyy-MM-dd`.

## 3. Anomalies (12 flags)

1. `anomaly` stream (26109): Fisher-Yates shuffle of candidates =
   works where `id ≠ W-1014` and status ∈ {in-execution, stalled}.
2. `flagged = [W-1014] + candidates[:11]`.
3. `FLAG_PLAN` in order: cost/high, cost/high, duplicate/high, delay/high, expenditure/high,
   delay/medium, delay/medium, utilisation/medium, cost/medium, expenditure/low, delay/low,
   utilisation/low.
4. Flag `i` (0-based) creates stream `mulberry32(26102 + i*101)`; inside `buildAnomaly`:
   `peerN = 18` for the flagship, otherwise `int(rng, 8, 18)`; then kind-specific draws
   (cost ratio: flagship pinned 58.9/24.6, high `2.0 + rng()*0.6`, else `1.4 + rng()*0.5`;
   expenditure ratio: high `1.6 + rng()*0.6`, else `1.2 + rng()*0.2`;
   utilisation band `0.55 + rng()*0.2`). Port the branch logic verbatim from
   `buildAnomaly` in the TS file; text templates come from `anomaly-engine.md`.
5. Ids `A-1..A-12` in flag order (A-1 = the W-1014 cost flag).

## 4. Evidence + activities

- **Evidence** (`evidence` stream 26123): 6 fixed files in order —
  `photo/"Site photo — foundation stage"`, `report/"Measurement sheet MB-3"`,
  `doc/"Completion certificate (draft)"`, `photo/"Geo-tagged photo — slab stage"`,
  `doc/"Utilisation certificate UC-2"`, `report/"Estimate comparative sheet"`.
  `workId = anomalies[index % 12].workId`, `sizeKb = int(rng, 180, 4200)`,
  `uploadedAt = (DEMO_TODAY − int(rng,1,40)d) at T10:00:00.000Z`,
  `by` = "Field Engineer (demo)" for even index else "District Office (demo)". Ids `E-1..E-6`.
- **Activities** (no rng): per anomaly index i, in order —
  1. flag row: `T-{n}`, at `(DEMO_TODAY−2d)T09:00:00.000Z`, actor `NIRIKSHAN engine (demo)`,
     action `Flag raised — needs review`, note = anomaly headline
  2. evidence row: at `(DEMO_TODAY−1d)T11:30:00.000Z`, actor `District Office (demo)`,
     action `Evidence linked for review`, no note
  3. note row (only i < 8): at `DEMO_TODAY T08:15:00.000Z`, actor `District Officer (demo)`,
     action `Review note recorded`, note `Field verification scheduled — needs review before next release.`
  4. escalation row (only i == 0): at `DEMO_TODAY T09:45:00.000Z`, actor `District Officer (demo)`,
     action `Queued for state nodal review (demo)`, no note

  Counter `T-1..` increments in generation order → 33 rows total (12×2 + 8 + 1).

## 5. Demo officers (no rng; backend-only addition)

| Email | Password | Role | state_scope | district_scope |
|---|---|---|---|---|
| `ministry@demo.gov.in` | `demo1234` | ministry | NULL | NULL |
| `state-mp@demo.gov.in` | `demo1234` | state | Madhya Pradesh | NULL |
| `district-bhopal@demo.gov.in` | `demo1234` | district | NULL | Bhopal |

Passwords bcrypt-hashed at seed time.

## 6. KPI constants (no rng)

Exactly: `totalWorks=12482, underExecution=4821, delayed=386, highRisk=73,
overrunExposureLakh=41`. Served by `GET /overview/kpis` (api-reference.md) until real ingest.

## 7. Geo rollup (port of `buildGeoRollup`)

Group works by state; per state: `works` = count; `high` = works with ≥1 high-severity anomaly;
`stalled` = status stalled count; `delayed` = stalled count + (in-execution works with
`due_date < DEMO_TODAY`). Output sorted by state name ascending. (Stored or derived at query
time — implementation choice, values identical either way.)

## 8. Parity test plan (`tests/test_seed_parity.py`)

1. Dev-only Node script (not shipped) imports `admin-dashboard/src/lib/mplads-mock.ts` via tsx
   and JSON-dumps `{works, anomalies, evidences, activities, geoRollup}` to a fixture file.
2. Python test regenerates the same five collections via `app/seed/generate.py`.
3. Deep-equal assert: all 40 works (21 fields each), 12 anomalies incl. `signals` arrays,
   6 evidence rows, 33 activity rows, 6-state geo rollup. Money compared at 1-decimal exactness;
   dates as strings. Note: TS `date-fns subDays` on `new Date(2026, 8, 7)` is local-time but
   only y/m/d are consumed — safe.
4. Pinned assertions: W-1014 values (§3), and A-1 signal 1 =
   `₹58.9L vs ₹24.6L median across 18 similar community-hall works in Bhopal`.
5. mulberry32 vectors from §1.
6. Fixture drift (mock file edited) fails the test → update both sides in one commit + ADR.

## 9. Migration wiring

- Alembic `0002_seed_demo` runs `app/seed/generate.py` and inserts everything in one
  transaction; alternatively a Docker entrypoint step gated by `SEED_DEMO=true`.
- Idempotent: skip when `works` already has rows; `SEED_DEMO=force` truncates demo tables first
  (works, anomalies, anomaly_signals, evidences, activities, work_decisions, officers).
- Officers + `work_decisions` are backend-only seeds; `work_decisions` starts empty.
