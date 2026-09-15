# SPEC 02b — Overview Backend (`/api/v1/overview`)

> Backend for SPEC 02's command centre. Everything on this screen is either a **constant
> snapshot** (KPI strip) or a **cached read model** (map + queue) — computed by the analytics
> engine (`context/backend/analytics-cache.md`), scoped by the officer's role
> (`Feature_docs/01-login/backend.md` §RBAC). Wire shapes are fixed by `api-reference.md`;
> this doc records the *derivation rules* per block.

## §A KPI strip → `GET /api/v1/overview/kpis`

```jsonc
// 200 — KpisOut (scheme snapshot, constant until real ingest)
{
  "totalWorks": 12482, "underExecution": 4821, "delayed": 386,
  "highRisk": 73, "overrunExposureLakh": 41,
  "source": "scheme-snapshot"      // tells the frontend to caption honestly
}
```

Served from `MPLADS_KPIS` constants (SPEC 02 table) while ingest is demo-only. When real
ingest exists, the same endpoint flips to a computed query — no contract change, the
`source` field becomes `"computed"`.

## §B India risk map → `GET /api/v1/overview/geo`

Per-state rollup for the map's risk wash + tooltip:

```jsonc
// 200 — GeoOut  ·  cached: geo_rollup(scope)   [analytics-cache.md §4.2]
{ "states": [
  { "state": "Madhya Pradesh", "works": 9, "high": 3, "delayed": 2, "stalled": 2 }
  // … 6 demo states; scoped: district officer sees 1 state, state officer MP only
]}
```

Derivation (exact port of `buildGeoRollup`, `mplads-mock.ts`):
- `works` — count of in-scope works in the state.
- `high` — works with **≥ 1 high-severity anomaly** (from stored `anomalies`, not recomputed).
- `delayed` — `status = 'stalled'` OR (`status = 'in-execution'` AND `due_date < DEMO_TODAY`).
- `stalled` — `status = 'stalled'` (today injected as `DEMO_TODAY`, never `date.today()`).

Map click → `GET /works?state={State}` (SPEC 03b); state names must match the frontend
TopoJSON's `properties.st_nm` spellings — seed data uses the same 6 spellings, asserted by the
seed parity test.

## §C Priority queue → `GET /api/v1/overview/queue`

```jsonc
// 200 — QueueOut  ·  cached: priority_queue(scope, today)
{ "items": [
  { "workId": "W-1014",
    "title": "Community Hall Construction",
    "district": "Bhopal", "state": "Madhya Pradesh",
    "sanctionedLakh": 58.9,
    "severity": "high",                  // max severity among the work's anomalies
    "reason": "Cost 2.4× peer median · stalled 96 days",   // template, anomaly-engine.md
    "anomalyId": "A-1" }                 // top anomaly driving the row
  // top 8 by severity rank (high→medium→low) then amount desc; SPEC 02's W-1014-first law
]}
```

Derivation: in-scope works joined to their stored anomalies; per work take max severity,
its top anomaly (`A-1` for the flagship), build `reason` from the stored headline + signal
labels (same templates SPEC 00 fixed — the backend never invents new phrasing). Works with no
anomalies are excluded; empty scope → `{"items": []}` (frontend renders the "All clear" Empty
state).

## Caching & freshness

| Endpoint | Cached fn | Invalidation |
|---|---|---|
| `/overview/geo` | `geo_rollup(scope)` | version bump on recompute/mutation + TTL 300 s |
| `/overview/queue` | `priority_queue(scope, today)` | same |
| `/overview/kpis` | not cached (constants) | — |

All three are role-scoped **before** caching (scope is part of the cache key) — a district
officer's rollup can never serve a ministry request.

## Acceptance (backend)

- Ministry scope: 6 states, flagship W-1014 is queue item 1 with severity `high`.
- District (Bhopal) scope: only Bhopal works; `geo.states` has exactly one entry.
- After `POST /detectors/recompute`, `high` counts and queue order reflect the new anomaly
  generation without process restart (version bump) — integration test asserts this.
