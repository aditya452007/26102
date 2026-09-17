# Backend API Reference — v1

> Contract for `app/api/v1/*` routers and the Pydantic schemas. JSON shapes below are the
> **only** shapes the frontend consumes; the client-side mirror is
> `admin-dashboard/src/lib/mplads-schema.ts` (Zod). A contract test in `tests/` asserts the
> examples in this file (key-for-key).
>
> Base URL: `http://localhost:8000/api/v1` · Interactive docs: `/docs` (FastAPI auto-OpenAPI)
> All money values are **lakhs** (`sanctionedLakh: 58.9` = ₹58.9 lakh). Dates are `yyyy-MM-dd`
> strings; timestamps are ISO 8601. Errors follow the shared error model in `README.md`.

## Authentication

`POST /auth/login` — exchange credentials for a JWT.

```json
// Request
{ "email": "ministry@demo.gov.in", "password": "demo1234" }

// 200 Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "bearer",
  "expiresIn": 604800,
  "officer": {
    "id": "3f1c9a2e-...",
    "email": "ministry@demo.gov.in",
    "fullName": "Ministry Officer (demo)",
    "role": "ministry",
    "stateScope": null,
    "districtScope": null
  }
}
```

The server also sets `nirikshan_session` (httpOnly, SameSite=Lax, 7d) so the TanStack server-fn
proxy can forward cookies instead of managing bearer tokens. `POST /auth/logout` clears it.
`GET /auth/me` returns the `officer` object above for the current token (401 otherwise).

Demo officers seeded by the generator (§5 of seed-generator.md):

| Email | Role | Scope |
|---|---|---|
| `ministry@demo.gov.in` | ministry | all |
| `state-mp@demo.gov.in` | state | Madhya Pradesh |
| `district-bhopal@demo.gov.in` | district | Bhopal |

---

## Works

### `GET /works` — filterable, sortable, paginated ledger

Mirrors `/dashboard/works` URL state (`?lens=&state=&district=&type=&q=`).

Query parameters:

| Param | Type | Notes |
|---|---|---|
| `lens` | `all` \| `needs-review` \| `high-risk` | `needs-review` = has any anomaly; `high-risk` = has a high-severity anomaly |
| `state` | string | exact match |
| `district` | string | exact match |
| `type` | string | one of the 6 work types |
| `q` | string | case-insensitive substring on `id`, `title`, `agency` |
| `status` | string | optional; one of the 4 statuses |
| `sort` | `amount` \| `updated` \| `id` | default `id` |
| `order` | `asc` \| `desc` | default `desc` for `amount`/`updated` |
| `page` | int ≥ 1 | default 1 |
| `pageSize` | int 1–100 | default 20 (frontend uses 10–50) |

Each row joins the officer's worst anomaly (severity rank high < medium < low) exactly like
`buildWorksRows` in the frontend.

```json
// 200 Response
{
  "items": [
    {
      "id": "W-1014",
      "title": "Community Hall — Ward Block 7",
      "agency": "Contractor-07",
      "type": "community-hall",
      "district": "Bhopal",
      "state": "Madhya Pradesh",
      "sanctionedLakh": 58.9,
      "progressPct": 62,
      "status": "stalled",
      "lastUpdate": "2026-06-03",
      "severity": "high",
      "kind": "cost"
    },
    {
      "id": "W-1007",
      "title": "Piped Water Extension — Zone 12",
      "agency": "Agency-East-3",
      "type": "water",
      "district": "Indore",
      "state": "Madhya Pradesh",
      "sanctionedLakh": 22.4,
      "progressPct": 34,
      "status": "in-execution",
      "lastUpdate": "2026-08-20",
      "severity": null,
      "kind": null
    }
  ],
  "total": 40,
  "page": 1,
  "pageSize": 20
}
```

`severity`/`kind` are `null` for unflagged works (`"clear"` is a frontend-only rendering value).

### `GET /works/{work_id}` — single work

404 if unknown or outside officer scope. Response is the bare `Work` object (all 21 contract
fields, same keys as `workSchema`), e.g.:

```json
{
  "id": "W-1014",
  "title": "Community Hall — Ward Block 7",
  "type": "community-hall",
  "state": "Madhya Pradesh",
  "district": "Bhopal",
  "agency": "Contractor-07",
  "status": "stalled",
  "sanctionedLakh": 58.9,
  "expenditureLakh": 41.2,
  "progressPct": 62,
  "sanctionDate": "2024-11-20",
  "dueDate": "2025-10-15",
  "lastUpdate": "2026-06-03",
  "lat": 23.3,
  "lon": 77.5,
  "tenderHolder": "Contractor-07",
  "tenderAwardedBy": "District Authority, Bhopal",
  "department": "PWD",
  "labourDeployed": 42,
  "demandedDays": 330,
  "returnedLakh": 0
}
```

### `GET /works/{work_id}/dossier` — the one-call dossier bundle

What `dossier-data.ts` assembles from three mock imports today. Response:

```json
{
  "work": { "...Work object as above..." },
  "anomalies": [ { "...Anomaly object, see below..." } ],
  "evidence": [ { "...Evidence object, see below..." } ],
  "activity": [ { "...Activity object, see below..." } ],
  "decision": { "status": "action-required", "note": "Field verification scheduled", "at": "2026-09-07T08:15:00.000Z", "by": "District Officer (demo)" },
  "peers": {
    "peerN": 18,
    "medianSanctionedLakh": 24.6,
    "medianExpenditureLakh": 11.8,
    "medianProgressPct": 55
  }
}
```

`decision` is `null` when the work has no recorded decision. `peers` = same type + same state.

### `GET /works/{work_id}/peers` — peer compare table (copilot tool)

```json
{
  "workId": "W-1014",
  "peerN": 18,
  "rows": [
    { "metric": "expenditure",  "workValue": 41.2, "peerMedian": 11.8 },
    { "metric": "progress",     "workValue": 62,   "peerMedian": 55 },
    { "metric": "stallDays",    "workValue": 96,   "peerMedian": 21 }
  ],
  "members": [ { "id": "W-1002", "title": "Community Hall — Ward Block 3", "sanctionedLakh": 24.1 } ]
}
```

`members` lists the peer group (same type + state, excluding the work) capped at 20 rows.

---

## Anomalies

### `GET /anomalies` — global flag list (queue, notifications, copilot)

Query parameters: `workId` (string), `severity` (`high|medium|low`), `kind`
(`cost|expenditure|delay|duplicate|utilisation`), `limit` (int ≤ 200, default 50).

```json
// 200 Response — items are the exact anomalySchema shape
{
  "items": [
    {
      "id": "A-1",
      "workId": "W-1014",
      "kind": "cost",
      "severity": "high",
      "headline": "Sanctioned cost 2.4× peer median with a 96d stall — needs review",
      "peerN": 18,
      "peerMedianLakh": 24.6,
      "actualLakh": 58.9,
      "unit": "₹L",
      "corroboration": "Single-estimate sanction plus a 96-day stall corroborates the cost variance.",
      "signals": [
        { "label": "Peer comparison", "value": "₹58.9L vs ₹24.6L median across 18 similar community-hall works in Bhopal" },
        { "label": "Corroborating signal", "value": "96d stall — last update 96d ago" }
      ]
    }
  ],
  "total": 12
}
```

The flagship example above is pinned: `tests/test_seed_parity.py` asserts A-1 for W-1014 equals
these values.

### `GET /anomalies/{anomaly_id}` — explain one flag (copilot tool)

Returns the single anomaly object (same shape as items above) plus `work` summary:
`{ "anomaly": {...}, "work": { "id", "title", "district", "state", "sanctionedLakh", "progressPct" } }`.

### `POST /detectors/recompute` — run all detectors, replace flags (ministry only)

Triggers the detector service (anomaly-engine.md) synchronously; 40-work dataset completes in
milliseconds. Response:

```json
{ "run": "2026-09-14T10:12:00.000Z", "detectorVersion": "rules-1.0", "anomaliesCreated": 12 }
```

Implementation note: recompute runs inside one transaction — delete all rows with the previous
`detector_version`, insert new ones with ids `A-1..A-n` renumbered in severity-then-work order
(id order is NOT stable across recompute; the frontend never persists anomaly ids).

---

## Evidence

### `GET /works/{work_id}/evidence`

```json
{
  "items": [
    {
      "id": "E-1",
      "workId": "W-1014",
      "kind": "photo",
      "name": "Site photo — foundation stage",
      "sizeKb": 2412,
      "uploadedAt": "2026-08-28T10:00:00.000Z",
      "by": "Field Engineer (demo)"
    }
  ]
}
```

### `POST /works/{work_id}/evidence` — multipart upload

Form fields: `file` (binary, required), `kind` (`doc|photo|report`, required).
Server stores to `UPLOAD_DIR` (config; default `./uploads`), records `sizeKb` from the stream,
`uploadedAt = now()`, `by` = officer display name. Returns the created Evidence object (201).
Demo seed rows have `storage_path: null` and download returns 404 for them (`GET
/evidence/{id}/file` streams the bytes when `storage_path` is set).

---

## Decisions & activity

### `POST /works/{work_id}/decision` — record officer decision

```json
// Request
{ "status": "verified", "note": "Site inspected; variance explained by flood foundation work." }

// 201 Response — WorkDecision object
{
  "id": "34",
  "workId": "W-1014",
  "status": "verified",
  "note": "Site inspected; variance explained by flood foundation work.",
  "at": "2026-09-14T10:20:00.000Z",
  "by": "District Officer (demo)"
}
```

Side effect (same transaction): an Activity row is appended —
`actor = officer.full_name`, `action = "Decision recorded — verified"`, `note = decision note`.

### `GET /works/{work_id}/activity`

```json
{
  "items": [
    {
      "id": "T-1",
      "workId": "W-1014",
      "at": "2026-09-05T09:00:00.000Z",
      "actor": "NIRIKSHAN engine (demo)",
      "action": "Flag raised — needs review",
      "note": "Sanctioned cost 2.4× peer median with a 96d stall — needs review"
    }
  ]
}
```

`id` is the `T-{n}` string form (contract). Ordered `at` DESC. `note` omitted when null.

---

## Notifications

### `GET /notifications` — derived attention feed

Derivation (exact port of `notifications/-components/data.ts`): for every anomaly with severity
`high` → one `high-risk` item; for every `utilisation` anomaly → one `uc` item; for every work
with `status = stalled` → one `stall` item; for every non-completed work past `due_date` → one
`overdue` item. Read-state/prefs stay client-side (localStorage), NOT in this API.

```json
{
  "items": [
    {
      "id": "N-high-W-1014",
      "kind": "high-risk",
      "title": "W-1014 flagged cost — high priority",
      "description": "Sanctioned cost 2.4× peer median with a 96d stall — needs review",
      "workId": "W-1014",
      "ageDays": 96
    }
  ]
}
```

`ageDays` = calendar days from the work's `last_update` (or `due_date` for overdue) to
`DEMO_TODAY`. Item ids are deterministic (`N-{kind}-{workId}`).

---

## Overview (command centre)

### `GET /overview/kpis`

```json
{
  "totalWorks": 12482,
  "underExecution": 4821,
  "delayed": 386,
  "highRisk": 73,
  "overrunExposureLakh": 41
}
```

Static scheme-snapshot constants until real ingest; scope-agnostic by design (matches the
current frontend label).

### `GET /overview/geo`

Geo rollup computed from works + anomalies (respects officer scope):

```json
{
  "items": [
    { "state": "Assam",          "works": 7, "high": 1, "delayed": 2, "stalled": 1 },
    { "state": "Bihar",          "works": 7, "high": 2, "delayed": 3, "stalled": 2 },
    { "state": "Karnataka",      "works": 7, "high": 1, "delayed": 2, "stalled": 2 },
    { "state": "Madhya Pradesh", "works": 7, "high": 3, "delayed": 4, "stalled": 2 },
    { "state": "Odisha",         "works": 6, "high": 2, "delayed": 2, "stalled": 1 },
    { "state": "Rajasthan",      "works": 6, "high": 1, "delayed": 2, "stalled": 1 }
  ]
}
```

Sorted by state name (matches `buildGeoRollup`). Counts above are illustrative — the parity test
compares against the generator's actual rollup, not this doc.

### `GET /overview/queue?limit=8` — priority queue

`severity DESC, then stall days DESC` ranking of flagged works in scope; returns
`{ "items": [ WorkRow... ] }` (same row shape as `GET /works`).

---

## Copilot tools (deterministic, no LLM)

The scripted frontend brain (`copilot-brain.ts`) currently computes these from mock imports.
Backend equivalents (same answers, same shapes) so an LLM can later call them as tools:

| Endpoint | Purpose | Notes |
|---|---|---|
| `GET /copilot/search?q=&scope=auto` | `searchWorks` tool | Reuses `GET /works` semantics; `scope=auto` applies officer scope |
| `GET /copilot/compare/{work_id}` | `comparePeers` tool | Alias of `GET /works/{work_id}/peers` (kept for tool-name clarity) |
| `GET /copilot/explain/{anomaly_id}` | `explainFlag` tool | Alias of `GET /anomalies/{anomaly_id}` |
| `GET /copilot/missing/{work_id}` | missing-data callout | Derived gaps: no evidence of kind `report` in 90d, UC pending, progress static |

```json
// GET /copilot/missing/W-1007
{
  "workId": "W-1007",
  "gaps": [
    { "label": "UC pending", "detail": "Utilisation certificate for the last release not attached" },
    { "label": "No recent measurement", "detail": "Last evidence uploaded 40d ago; progress changed 12d ago" }
  ]
}
```

Out of scope (explicit): `POST /ai/chat`, streaming, token accounting — deferred until the LLM
decision (ADR-025 leaves this open). The tool endpoints above are the stable substrate.

---

## CORS & proxying

FastAPI allows only the TanStack origin (`http://localhost:3000`) if direct browser calls are
ever enabled; the primary path is server-fn → FastAPI server-side (no CORS involvement). The
TanStack server fns read the base URL from an env var (`MPLADS_API_URL`, default
`http://localhost:8000/api/v1`).

## Pagination envelope (all list endpoints)

`{ "items": [...], "total": int, "page"?: int, "pageSize"?: int }` — `page`/`pageSize` present
only where the client paginates (works ledger); other lists return `items` + `total`.
