# API Verification Plan — curl matrix (2026-09-16)

> Goal: prove every v1 endpoint works **as the frontend expects** — good data returns the
> exact contract shapes (`api-reference.md` == `mplads-schema.ts` Zod), bad data returns the
> documented 4xx + error body, auth/RBAC gates hold, the analytics engine recomputes honestly.
>
> **Scope note (important)**: the frontend server-fn bodies still read the bundled mock
> (the swap is progress-tracker "Next Up" #1). This matrix therefore verifies the backend
> against the shapes the Zod schemas accept; after the swap, the same requests originate
> from the browser and the frontend dev-server log becomes the client-side evidence.
>
> **RESULT (2026-09-16): PASS — 3 bugs found & fixed** (ADR-032, progress-tracker):
> (1) Pony×FastAPI `db_session` yield-dependency leaked thread-local sessions under
> concurrency → intermittent 500s; dependency deleted, services own their transactions;
> proven with a 12-simultaneous-request curl hammer. (2) Decision serialized `"id":"None"`
> (unflushed auto PK) → `orm.flush()` before serializing. (3) Activity emitted `"note":null`,
> violating Zod's `string.optional()` law (absent, never null) → key omitted by serializer.
> Contract gate `admin-dashboard/scripts/verify-api-contract.ts` parses the captured bodies
> with the REAL Zod schemas — all green. Expectation corrections: B6/B7 were plan errors
> (W-1014 IS a Bhopal work — in-scope for the Bhopal officer; the real out-of-scope probe
> used W-1002 → 404 read / 403 write), and extension/size rejection is 403 (policy family),
> 422 is reserved for enum/shape violations.

## 0. Boot & pre-flight

| Step | Command | Expect |
|---|---|---|
| Postgres up | `docker compose up -d postgres` | container healthy |
| Pristine seed | `SEED_DEMO=force python -m app.seed.insert` | 40 works / 12 anomalies / 6 evidence / 33 activities |
| API server | `uvicorn app.main:app --port 8000`, logs → `backend/.run/uvicorn.log` | boot line + no tracebacks |
| Meta | `GET /healthz`, `GET /docs`, `GET /openapi.json` | 200; openapi lists 23 `/api/v1` paths |

## 1. Matrix — good data (contract shapes)

| # | Endpoint + token | Assert |
|---|---|---|
| G1 | `POST /auth/login` ministry | 200; body keys `{accessToken, officer}`; officer has role/scopes; bcrypt roundtrip works |
| G2 | `GET /works?lens=all` (ministry) | 200; `{items,total,page,pageSize}`; `total=40`; item keys == `workRowSchema` |
| G3 | `GET /works?sort=amount&order=desc&page=2&pageSize=10` | 200; 10 items; page metadata echoes; sorted |
| G4 | `GET /works/W-1014` | 200; `sanctionedLakh=58.9`, `status="stalled"` (pinned parity row) |
| G5 | `GET /works/W-1014/dossier` | 200; keys `{work, flags, evidence, activity, decision?, stallDays, utilisationPct}` — **no `peers` block** (ADR-031) |
| G6 | `GET /works/W-1014/peers` | 200; real (type,state) n≥8 computation — likely `items: []` (documented, honest) |
| G7 | `GET /anomalies` | 200; `total=12`; first item `A-1` (order high→medium→low); signals array present |
| G8 | `GET /anomalies?severity=high` / `?workId=W-1014` | filtered counts consistent with the fixture |
| G9 | `GET /notifications` | 200; kind rank ordering (high-risk→stall→uc→overdue), age DESC inside kind |
| G10 | `GET /overview/kpis` · `/geo` · `/queue` | scheme constants / geo rollup rows (MP=8 works) / top-8 flagship-first queue |
| G11 | `GET /copilot/search?q=…` · `/compare/W-1014` · `/explain/A-1` · `/missing/W-1014` | tool shapes per api-reference.md |
| G12 | Evidence download of a **freshly uploaded** file | 200 with bytes (seed rows have no stored file → their download is a documented 404) |

## 2. Matrix — bad data (error contract)

| # | Request | Expect | Why |
|---|---|---|---|
| B1 | `POST /auth/login` wrong password / unknown email | 401 `{detail}` | no user enumeration — same message both |
| B2 | `POST /auth/login` malformed JSON / missing fields | 422 + field errors | Pydantic boundary |
| B3 | Any endpoint with **no token** / garbage token | 401 | security dep |
| B4 | `GET /works?page=0`, `pageSize=999`, `lens=bogus` | 422 | Query constraints (`ge=1`, enum) |
| B5 | `GET /works/W-9999` (ministry) | 404 | unknown id ≠ forbidden |
| B6 | `GET /works/W-1014` (district-Bhopal token — MP work) | 404 | read-out-of-scope == 404 law |
| B7 | `POST /works/W-1014/evidence` (district token) | **403** | write-out-of-scope == 403 law |
| B8 | evidence multipart: `.exe` filename / `kind=bogus` | 422 | upload allowlist |
| B9 | `POST /works/W-1014/decision status="bogus"` | 422 | `Literal` boundary (never reaches DB CHECK) |
| B10 | `POST /detectors/recompute` district token | 403 | ministry-only |
| B11 | `GET /anomalies/A-999`, `/copilot/compare/W-9999` | 404 | detail 404s |
| B12 | every 4xx above | `X-Request-Id` header present + `{detail}` body | error model + debuggability |

## 3. Analytics engine — live behavior

| # | Action | Expect |
|---|---|---|
| E1 | reseed → `GET /anomalies` | 12 seed flags, `detectorVersion="rules-1.0-seed"` |
| E2 | `POST /detectors/recompute` (ministry) | 200 `{run, detectorVersion:"rules-1.0", anomaliesCreated:0}` — honest empty (no peer group ≥8 at demo scale, ADR-031) |
| E3 | `GET /anomalies` after recompute | total 0 — stored flags replaced in-transaction |
| E4 | `SEED_DEMO=force` reseed → `GET /anomalies` | 12 again (restore for the demo) |
| E5 | two rapid `GET /overview/geo` | identical bodies (versioned lru_cache serving; TTL law unit-tested) |

## 4. Method

1. Boot stack + pre-flight; start uvicorn with stdout/stderr captured to `backend/.run/`.
2. Run the matrix in **parallel curl batches per area** (auth+meta, works, anomalies+engine,
   writes, read models, copilot), each curl capturing HTTP code + body to a file; print batch
   results together.
3. Contract gate: validate the captured G-bodies against the real Zod schemas
   (`mplads-schema.ts`) via `npx tsx` — the same schemas the frontend screens run on load.
4. Read `uvicorn.log` end-to-end: every non-2xx access line gets an interpretation
   (why it happened, what resolves it); any traceback = plan amendment + fix.
5. Sync context: results + any contract deltas → progress-tracker entry; leave the plan file
   as the reusable checklist.
