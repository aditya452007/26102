# NIRIKSHAN-AI Backend — Documentation Index

> Backend for the MPLADS risk-intelligence workspace (SIH26102). Python + FastAPI + Postgres.
> **Status**: documented, not yet implemented. These specs exist so implementation code and
> AI agents never invent shapes, formulas, or endpoints — they read them from here.
>
> **Doc set** (read in this order):
> 1. `structure.md` — feature-first layout, controller → service → repository law, Pony ORM
> 2. `data-model.md` — Postgres tables, columns, constraints, ERD
> 3. `api-reference.md` — every endpoint: method, path, auth, request, response JSON, errors
> 4. `anomaly-engine.md` — the 5 rule-based detectors with exact formulas and thresholds
> 5. `analytics-cache.md` — pandas compute pipeline, storage, versioned lru_cache TTL
> 6. `seed-generator.md` — the Python port of the TS demo generator (byte-identical seeds)
>
> Per-feature backend specs (endpoints + derivation rules in feature context) live in
> `Feature_docs/01-login/backend.md` … `Feature_docs/05-ai-copilot/backend.md` — they extend
> this doc set, they don't replace it.

---

## What this backend is (and is not)

**It is**: a deterministic analytics-and-workflow API. It stores MPLADS works (eSAKSHI-shaped),
runs **rule-based detectors** at ingest to produce explainable anomalies (peer-group statistics,
never naked scores), serves them to the existing TanStack Start frontend, records officer
decisions, and manages JWT auth with district/state/ministry scoping.

**It is not** (per user decision, 2026-09-14):
- **No ML.** All detection is transparent SQL/Python rules with human-readable formulas.
- **No LLM integration yet.** The `/ai/chat` endpoint is out of scope for the first build; the
  deterministic copilot tools (`searchWorks`, `getWork`, `comparePeers`, `explainFlag`,
  `listEvidence`) exist here as **normal REST endpoints** the existing scripted frontend brain
  can call, so an LLM can be slotted behind them later without contract changes.
- **No eSAKSHI scraping.** Ingest assumes data arrives as structured payloads shaped like
  `WorkIn` (see `data-model.md`); a future scraper feeds this same ingest path.

## Architecture

```
TanStack Start (admin-dashboard)
  └─ createServerFn (src/server/mplads/*.ts)         ← stays; mock→real swap point
       └─ HTTP (fetch, server-side, same Zod shapes)  ← one-line change per call site
            └─ FastAPI (app/features/*/router.py)     ← this backend
                 ├─ JWT auth + RBAC scoping (district/state/ministry)
                 ├─ Pony ORM → Postgres (sync, threadpool; see structure.md)
                 ├─ pandas detector pipeline (compute+store at ingest)
                 ├─ versioned lru_cache read models (analytics-cache.md)
                 └─ Seeded demo dataset (port of mplads-mock.ts)
```

**Layering law** (structure.md): router (controller) → service → repository → entities,
feature-first folders under `app/features/<feature>/`. Services take/return Pydantic models,
repos are the only Pony-speaking layer, and copilot/overview/dossier all reuse the same repo
functions so screens and tools can never disagree.

**Why server-fn proxy (user decision, ADR-025)**: the browser never talks to FastAPI directly —
no CORS surface, SSR loaders keep working, and the frontend's "mock behind identical shapes"
contract (ADR-006/007) survives intact: each `createServerFn` changes only its body (mock import
→ HTTP call), not its signature.

## Stack (locked by decision)

| Layer | Choice | Notes |
|---|---|---|
| Framework | **FastAPI** | Auto OpenAPI at `/docs`; Pydantic v2 request/response models |
| DB | **PostgreSQL 16** | One database `nirikshan`; demo + future real data |
| ORM | **Pony ORM** | Minimum-lines-of-code queries (generator expressions, ADR-027); sync — FastAPI plain-`def` handlers run it in the threadpool (structure.md §async boundary) |
| Analytics | **pandas** + NumPy | Detector math (groupby/median/ratio); pure functions, no I/O (analytics-cache.md) |
| Caching | **functools.lru_cache** behind a version tag | ~30-line decorator, TTL + invalidation, no cache library (analytics-cache.md §4) |
| Migrations | **Alembic** | Versioned schema; the demo seed is a data migration step |
| Auth | **JWT** (`python-jose`) + `passlib[bcrypt]` | `Authorization: Bearer`; role-scoped claims — see `Feature_docs/01-login/backend.md` |
| Validation | **Pydantic v2** | Mirrors `mplads-schema.ts` field-for-field |
| Package mgmt | **uv** | `pyproject.toml`-based, locked |
| Tests | **pytest** + httpx `AsyncClient` | Contract tests assert the JSON shapes below |
| Runtime | **Docker Compose** | `api` + `postgres` services for local dev |

## Repository layout (when implemented)

```
backend/
├── pyproject.toml            # uv-managed deps
├── Dockerfile
├── docker-compose.yml        # api + postgres:16-alpine
├── alembic/
│   └── versions/             # 0001_init (tables), 0002_seed_demo (generator output)
├── app/
│   ├── main.py               # FastAPI factory, mounts feature routers under /api/v1
│   ├── core/                 # config, security (JWT/bcrypt), Pony db + entities
│   ├── common/               # errors, pagination, caching decorator
│   ├── features/             # FEATURE-FIRST — see structure.md for the law
│   │   ├── auth/             # router / service / repo / schemas per feature
│   │   ├── works/
│   │   ├── anomalies/
│   │   │   └── engine/       # pipeline.py + 5 pure pandas detector fns
│   │   ├── evidence/
│   │   ├── decisions/
│   │   ├── notifications/
│   │   ├── overview/
│   │   └── copilot/
│   └── seed/
│       ├── rng.py            # mulberry32 port (seed-generator.md §1)
│       └── generate.py       # works/anomalies/evidence/activities/geo (§2–§4)
└── tests/
    ├── test_contract_works.py    # asserts response JSON == documented shapes
    ├── test_seed_parity.py       # W-1014 must equal the pinned values
    └── test_detectors.py
```

## Frontend integration model

The frontend keeps **every existing call site** and swaps bodies only:

| Frontend today (mock) | Becomes | Backend endpoint |
|---|---|---|
| import from `mplads-mock.ts` in `-components/data.ts` | `createServerFn` → GET | `GET /api/v1/works`, `/anomalies`, `/overview/*` |
| `dossier-data.ts` mock bundle | `createServerFn` → GET | `GET /api/v1/works/{work_id}/dossier` (single bundle) |
| localStorage decisions/uploads | `createServerFn` → POST | `POST /decisions`, `/evidence` |
| `notif-prefs.ts` read-state stays client-side | `createServerFn` → GET | `GET /api/v1/notifications` (items only; read-state remains local) |
| `copilot-brain.ts` tool fns | direct tool calls from server fns | `GET /api/v1/copilot/compare`, `/explain`, `/search` |

The Zod schemas in `admin-dashboard/src/lib/mplads-schema.ts` remain the client-side contract.
**Rule**: if a backend response field would ever change, the change happens in BOTH
`mplads-schema.ts` and the Pydantic schema in the same commit, with a contract test failing
until both agree.

## Roles and scoping (the RBAC lens)

The frontend already models three lenses (role switcher, `officerRoleSchema`). The backend makes
them real authorization, not just filters:

| Role | Sees | Enforcement |
|---|---|---|
| `ministry` | All works | No scoping predicate |
| `state` | One state (demo: Madhya Pradesh) | SQL predicate `work.state = officer.state_scope` |
| `district` | One district (demo: Bhopal) | SQL predicate `work.district = officer.district_scope` |

Every list endpoint applies the officer's scope **in SQL**, before filters. Decisions and
evidence writes verify the target work is inside scope (403 otherwise). Demo officers are seeded
by the generator (`seed-generator.md §5`).

## Error model (all endpoints)

```json
{ "detail": "human-readable message" }
```

| Status | When |
|---|---|
| 400 | Malformed query/body (FastAPI validation detail) |
| 401 | Missing/expired/invalid JWT |
| 403 | Valid JWT, work outside officer scope, or role lacks permission |
| 404 | Unknown `work_id` / `anomaly_id` / `evidence_id` |
| 422 | Pydantic validation failure (FastAPI standard body) |
| 500 | Unhandled (never leak internals; log with request id) |

## Demo data facts (asserted by tests)

- 40 works across 6 states × 12 districts; 12 anomalies (5 high / 4 medium / 3 low); 6 evidence
  files; 33 activity rows; 6-state geo rollup.
- Flagship `W-1014`: community-hall, Bhopal, sanctioned ₹58.9L, expenditure ₹41.2L, progress 62%,
  status stalled, last update 96d before 2026-09-07, cost flag with `peerMedianLakh: 24.6`,
  `peerN: 18`, `actualLakh: 58.9`.
- `DEMO_TODAY = 2026-09-07` is a config constant (`DEMO_TODAY_ISO`), never `date.today()`, so the
  demo is reproducible. Switching to real ingest means replacing this constant, not the code.
