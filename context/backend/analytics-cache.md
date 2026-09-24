# Analytics Engine — Compute, Storage, Cache

> How MPLADS risk analytics are calculated, where results live, and how they are served fast
> without ever going stale. The engine is **rule-based** (no ML, ADR-025): five transparent
> detectors producing explainable peer statistics. This doc is the compute + caching layer;
> the formulas themselves are `anomaly-engine.md` — one concern per doc.

Stack (locked, ADR-027): **pandas** for groupby/median/percentile math, **functools.lru_cache**
fronted by a version tag for caching, **Pony ORM** for persistence. Design rule: *pure pandas
functions in, DataFrame out — no DB, no dates, no clock inside detector code.* All
non-determinism is injected from the pipeline.

---

## 1. Data flow (one direction, no re-entry)

```
            ┌────────────────────────────────────────────────────────┐
 ingest /   │  pipeline.run(session, today)                          │
 recompute  │  1. load_frames()     ── pandas DataFrames from Pony   │
      ────▶ │  2. run_detectors()   ── pure fns, one per detector    │
            │  3. persist()         ── replace anomalies + signals   │
            │  4. bump_version()    ── analytics:v{n} + 1            │
            └────────────────────────────────────────────────────────┘
                                        │
             writes go through          ▼
        ┌─────────────────────────────────────────┐
        │ Postgres (source of truth)              │
        │  anomalies + anomaly_signals            │
        │  (audit trail: detector_inputs JSONB)   │
        └─────────────────────────────────────────┘
                                        │
   reads (overview, queue,              ▼
   dossier, notifications)   ┌───────────────────────────────────────┐
   ─────────────────────────▶│ Cached read models (§4)               │
                             │  lru_cache, keyed on analytics:v{n}   │
                             │  miss → query Postgres → cache → serve│
                             └───────────────────────────────────────┘
```

Two separate layers, never conflated:

| Layer | What | Where | Lifetime |
|---|---|---|---|
| **Detector outputs** | anomalies + signals rows (with `detector_inputs` audit JSONB) | Postgres `anomalies` table | permanent until next recompute |
| **Read-model cache** | rollups, queue, peer stats, KPI tuples | in-process `lru_cache` | until version bump or TTL |

Detectors **compute and store** (user decision): the API never re-derives a flag on read — it
reads stored anomalies. This is what makes "why flagged" stable, auditable, and replayable via
`detector_version`.

---

## 2. Compute — pandas, minimum lines

Detector modules are pure functions: `DataFrame(s) in → detection rows out`. The pipeline owns
all I/O. Representative shape (formulas live in `anomaly-engine.md`):

```python
# features/anomalies/engine/pipeline.py
DETECTORS: list[Detector] = [cost, delay, duplicate, expenditure, utilisation]

def run(session, today: date) -> PipelineReport:
    frames = load_frames(session)                 # works df + type-peer stats df
    found   = [d(frames, today) for d in DETECTORS]   # pure, no I/O inside
    persist(session, found)                       # delete+insert in one tx
    bump_version()                                # invalidate every read model at once
    return PipelineReport(per_detector=...)

# features/anomalies/engine/cost.py — detector fns are one-liners over pandas
def peer_stats(works: pd.DataFrame) -> pd.DataFrame:
    return (works.groupby(["type", "state"])["sanctioned_rs"]
                 .agg(peer_n="count", median="median").reset_index())

def cost_flags(works: pd.DataFrame, stats: pd.DataFrame, today: date) -> pd.DataFrame:
    j = works.merge(stats, on=["type", "state"])
    j["ratio"] = j.sanctioned_rs / j.median
    return j[(j.peer_n >= MIN_PEERS) & (j.ratio >= 1.4)]        # thresholds → anomaly-engine.md
```

Why pandas and not raw SQL for the math: peer medians, percentile bands and group ratios are
3–4 chained vectorised calls; the same logic in SQL window functions is 3× the lines and
cannot be unit-tested without a DB. Postgres stays the *store*; pandas is the *calculator*.
Scale note: the dataset is thousands of rows — one process, one DataFrame load, sub-100 ms
compute. No Spark, no Celery, no workers for v1.

Rounding: all money halves-up to the nearest ₹10k (`round_10k` in `common/mathutil.py`,
TS `Math.round(x/10000)*10000` — the rupee mirror of the old 0.1L precision; never Python's
banker's `round`).

---

## 3. Storage — what a detector writes

Persisted shape is exactly `data-model.md §anomalies` — no analytics-specific tables:

- One `anomalies` row per flag: `kind`, `severity`, `headline`, `peer_n`, `peer_median_rs`,
  `actual_rs`, `unit='₹'`, `corroboration`, `detector_version`, `detector_inputs` (JSONB:
  every formula input at detection time — the audit trail the dossier renders).
- `anomaly_signals` rows (ordered `position`) — the corroboration chips.
- **Replace-in-transaction recompute**: `DELETE FROM anomalies WHERE detector_version = old`
  then insert the new set, inside one `db_session(serialized=True)`. `POST
  /detectors/recompute` (api-reference.md) is the only entry point; a recompute failure leaves
  the previous generation untouched.
- IDs: seed generator pins `A-1…A-24`; recompute runs allocate `A-{max+1}` upward. The
  `detector_version` column makes any historical generation attributable.
- **No duplicate storage of derived rollups.** Geo rollup, KPI tuples, queue, notification
  feed are *not* tables — they are cached read models (§4) computed from base tables on
  demand. One write path, zero sync bugs.

---

## 4. Cache — `lru_cache` behind a version tag

### 4.1 The mechanism (one decorator, ~30 lines, in `common/caching.py`)

Python's `lru_cache` has no TTL or invalidation. Rather than import a cache library, we wrap
it once — cache key gains a **version component**; bumping the version makes every entry
unreachable and lets lru_cache evict them naturally:

```python
# common/caching.py
_VERSION = 1                            # process-local; bump_version() sets _VERSION += 1

def cached(maxsize: int = 128, ttl: float = 300):
    """@cached(ttl=300) — memoize per (version, time-bucket, args)."""
    def deco(fn):
        @lru_cache(maxsize=maxsize)
        def _versioned(version: int, ts_bucket: int, *args, **kwargs):
            return fn(*args, **kwargs)          # ts_bucket = int(time.time() // ttl)
        @wraps(fn)
        def wrapper(*args, **kwargs):
            return _versioned(current_version(), int(time.time() // ttl),
                              *args, **kwargs)
        wrapper.bust = _versioned.cache_clear   # belt-and-braces for tests
        return wrapper
    return deco
```

Two invalidation triggers, both simple:

1. **Version bump (correctness)** — `bump_version()` in the pipeline after every recompute or
   any work/evidence/decision mutation that could change analytics output. All read models
   keyed `analytics:v{n}` die at once; next read recomputes from Postgres.
2. **TTL (liveness)** — `ts_bucket = epoch // ttl` in the key: after `ttl` seconds the next
   call computes a new bucket. Default 300 s. Protects against manual DB edits and multi-worker
   memory drift; costs nothing when the version also bumped.

### 4.2 What is cached (read models)

| Read model | Served to | Cached fn | Args in key |
|---|---|---|---|
| Geo rollup (6-state) | `GET /overview/geo` | `geo_rollup(scope)` | version, scope |
| Priority queue (top-8) | `GET /overview/queue` | `priority_queue(scope, today)` | version, scope, ts_bucket |
| KPI tuple | `GET /overview/kpis` | `kpi_snapshot(scope)` | version, scope |
| Notification feed | `GET /notifications` | `notification_feed(scope, today)` | version, scope, ts_bucket |
| Peer comparison | `GET /works/{id}/peers` | `peer_comparison(work_id)` | version, work_id |

Scope is part of every key — a district officer and a ministry officer hit different cache
entries of the same function; scoping happens **before** caching so no cross-role leak is
possible.

Notes: the in-process cache is per-worker (uvicorn `--workers N` → N independent caches) —
correct, because the version bump plus TTL bounds staleness; if a future deployment needs
cross-worker coherence, the same `cached()` signature moves to a Redis backend with no
call-site changes. `lru_cache(maxsize=128)` against ~10 distinct keys per role is generous;
drop `maxsize` to 32 if memory matters.

### 4.3 What is deliberately NOT cached

- `GET /works` list + filters — Pony + Postgres answer in single-digit ms at demo scale;
  caching paginated filter permutations buys nothing.
- Dossier bundle — assembled per request (work + stored anomalies + evidence + activity);
  each piece is cheap and freshness here is the product.
- Auth/JWT checks — never cached.

## 5. Failure & observability rules

- `pipeline.run` is the **only** writer of `anomalies`/`anomaly_signals`; services never
  insert anomaly rows ad hoc.
- Every detector raises a typed `DetectorError` (caught by the pipeline, logged with
  detector name + work ids in the report); a failed detector aborts the whole recompute
  transaction — no partial generations, ever.
- `PipelineReport` (per-detector counts, duration, version before/after) is returned by
  `POST /detectors/recompute` and logged — the demo's proof-of-work trace.
- Cache fns must stay pure w.r.t. Postgres reads only — no HTTP, no clock (today is always an
  injected `DEMO_TODAY` / request-time argument, in the key where it matters).
