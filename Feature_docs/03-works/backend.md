# SPEC 03b — Works Ledger Backend (`/api/v1/works`)

> Backend for SPEC 03's full ledger. The frontend's URL semantics (`?lens=&state=&district=
> &type=&q=` + sort + pagination) map 1:1 onto query parameters; the repo query is one Pony
> generator expression (`structure.md` §works/repo). Wire shapes fixed in `api-reference.md`
> §Works. Money arrives and leaves as lakhs (`sanctionedLakh`), never rupees, never paise.

## Endpoints

### `GET /api/v1/works`

| Query param | Type | Semantics (mirror SPEC 03 toolbar exactly) |
|---|---|---|
| `lens` | `all \| needs-review \| high-risk` (default `all`) | `needs-review` = work has ≥1 anomaly (severity ≠ none) · `high-risk` = ≥1 **high** anomaly |
| `state`, `district`, `type` | string / enum | equality filters; `type` ∈ road \| community-hall \| water \| school \| drainage \| streetlight |
| `q` | string | case-insensitive `includes` over `id` + `title` + `agency` (SPEC 03's `includesString`) |
| `severity`, `kind` | repeated | multi-check filters over stored anomalies (`severity=high&severity=medium`) |
| `sort` | `severity-amount` (default) \| `amount-desc` \| `updated-desc` | SPEC 03: severity rank → amount desc is the default order |
| `page`, `page_size` | int (defaults 1, 10; max 50) | SPEC 03 pagination cap; response is the envelope below |

```jsonc
// 200 — Page[WorkOut]  ·  NOT cached (analytics-cache.md §4.3)
{
  "items": [ { "id": "W-1014", "title": "Community Hall Construction",
    "type": "community-hall", "state": "Madhya Pradesh", "district": "Bhopal",
    "agency": "PWD Bhopal", "status": "stalled",
    "sanctionedLakh": 58.9, "expenditureLakh": 41.2, "progressPct": 62,
    "sanctionDate": "2025-11-12", "dueDate": "2026-08-30", "lastUpdate": "2026-06-03",
    "stalledDays": 96, "severity": "high", "kind": "cost" } ],
  "page": 1, "page_size": 10, "total": 40, "total_pages": 4
}
```

- `severity`/`kind` per work = max-severity anomaly and its kind (queue uses the same rule) —
  computed from stored anomalies at read time, or `null`/`"clear"` when none (Zod allows
  both; the seed parity test pins the exact choice for the demo set).
- `stalledDays` = `DEMO_TODAY - last_update` when > 90 and not completed, else `null`.
- Lens + severity + kind read from stored `anomalies` rows — the engine computed them; reads
  never re-derive (analytics-cache.md §1).

### `GET /api/v1/works/{work_id}`

Single `WorkOut` (same shape). 404 `{"detail": "Work W-9999 not found"}` when unknown **or
outside scope** (scope violations are 404 here, not 403 — a ledger row that doesn't exist for
you shouldn't advertise itself; write endpoints 403 instead, §below).

### `GET /api/v1/works/{work_id}/peers`

Peer comparison for SPEC 03's row menu and SPEC 04's "Compare peers" action.

```jsonc
// 200 — PeersOut  ·  cached: peer_comparison(work_id)   [analytics-cache.md §4.2]
{ "work": { "id": "W-1014", "sanctionedLakh": 58.9 },
  "peerGroup": { "type": "community-hall", "state": "Madhya Pradesh", "n": 18,
                 "medianLakh": 24.6 },
  "distribution": [ { "id": "W-1032", "sanctionedLakh": 25.1 }, … ],   // all n, sorted asc
  "position": { "rank": 18, "of": 18, "percentile": 100 } }
```

Peer group = same `type` + same `state`, excluding self (`data-model.md` §works) — identical
semantics the cost detector used, so the dossier's "why flagged" and this endpoint can never
disagree.

## Scope + writes

- Every query above is scope-predicated in the repo (`structure.md`), from the JWT claims —
  the `?state=` filter can only narrow, never widen.
- v1 has **no** work-mutation endpoints (SPEC 03 out-of-scope: edit flows). Works are written
  only by the seed generator and future ingest; the moment ingest lands, its writes go through
  `pipeline.run` (recompute) so anomalies stay in sync.

## Acceptance (backend)

- `?lens=high-risk&state=Madhya+Pradesh` returns exactly the demo set's MP high-severity
  works; counts in `?lens=` toggle labels (All 40 · Review 12 · High 5) come from
  `total` per lens — frontend can fetch all three cheaply (not cached, ms-cheap).
- `q="hall"` matches W-1014 by title; `q` is id/title/agency substring, case-insensitive.
- `sort=severity-amount` puts W-1014 first for ministry scope (parity test pins this).
- Unknown id → 404; district officer asking for another district's work → 404 (same).
