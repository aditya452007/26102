# Backend Implementation Plan — Design Contract

> The build plan for `backend/`. Written BEFORE code per the `design-patterns` skill
> (design pass §6). The specs it implements live beside it: `structure.md` (layout law),
> `data-model.md` (tables), `api-reference.md` (wire contract), `anomaly-engine.md`
> (formulas), `analytics-cache.md` (compute/cache), `seed-generator.md` (demo data).
> **This doc adds**: module map, named patterns, OOP rules, response-handling law,
> work packages (parallel-agent-ready), build order. If code and this doc disagree,
> the doc wins until a new ADR says otherwise.

---

## 1. Named patterns (where each applies — no unnamed improvisation)

| Pattern | Where | Why here |
|---|---|---|
| **Layered architecture** | router → service → repo, one direction (structure.md) | the whole app; never skip layers |
| **Repository** | `features/*/repo.py` — the only Pony-speaking layer | services testable without a DB; ORM swappable |
| **Service layer** | `features/*/service.py` — plain functions, Pydantic in/out | all business rules; no HTTP, no ORM |
| **DTO / Mapper** | `features/*/schemas.py` — Pydantic `*Out` + explicit `from_entity()` | wire contract (`mplads-schema.ts` twin) never leaks entities |
| **Dependency Injection** | FastAPI `Depends`: `current_officer`, `unit_of_work`, `Settings` | auth/tx/config injected at the router; fakes in tests |
| **Factory** | `app/main.py:create_app()` | one assembly point; test app reuses it |
| **Registry (plugin)** | `engine/DETECTORS: list[DetectorFn]` + `DETECTOR_VERSION` | new detector = new file + one list entry; pipeline never edits |
| **Unit of Work** | `unit_of_work` dependency wrapping `db_session` | one transaction per request; commit at end, rollback on AppError |
| **Singleton (careful)** | module-level `db` (Pony), `Settings` instance | idiomatic Python; no container framework |

Deliberately **not** used (YAGNI, design-patterns skill anti-traps): no class-based
services (functions suffice — "if two classes share only a method, a function is
enough"), no interface/ABC layers with one implementation, no DI container library,
no CQRS/event bus, no `models/` + `schemas/` split beyond the per-feature pair.

## 2. Module map (every file, one line each)

```
backend/
├── pyproject.toml               # uv-managed: fastapi, pony, pandas, python-jose, bcrypt, alembic…
├── uv.lock                      # committed lockfile (ssdlc: dependency hygiene)
├── .env.example                 # placeholders; real .env gitignored
├── Dockerfile                   # python:3.13-slim, non-root, uvicorn
├── docker-compose.yml           # postgres:16-alpine (healthcheck) + api
├── alembic/
│   ├── env.py                   # reads DATABASE_URL from app settings
│   └── versions/0001_init.py    # hand-written SQL DDL (data-model.md) — Alembic autogen needs SQLAlchemy, so migrations are explicit
├── app/
│   ├── main.py                  # create_app(): CORS allowlist, request-id middleware, error handlers, router mounts, /healthz
│   ├── core/
│   │   ├── config.py            # Settings(pydantic-settings): DATABASE_URL, JWT_SECRET, DEMO_TODAY_ISO, UPLOAD_DIR, seed gate
│   │   ├── db.py                # Pony `db` + all 7 entities (one binding — Pony requires pre-mapping registration) + generate_mapping()
│   │   ├── security.py          # bcrypt hash/verify (direct bcrypt lib), JWT encode/decode (python-jose), claims dataclass
│   │   └── deps.py              # unit_of_work, current_officer (JWT → OfficerClaims), require_ministry
│   ├── common/
│   │   ├── errors.py            # AppError hierarchy + register_error_handlers(app) → {"detail": …}
│   │   ├── schemas.py           # CamelModel base (camelCase wire), Page[T], ItemsOut[T]
│   │   ├── pagination.py        # page/pageSize query params (1–100, default 20)
│   │   └── caching.py           # versioned lru_cache decorator (analytics-cache.md §4.1, ~30 lines)
│   ├── seed/
│   │   ├── rng.py               # mulberry32 port + int/oneDecimal/shuffled helpers (seed-generator.md §1–2)
│   │   ├── generate.py          # build_demo_dataset() → pure dicts (works/anomalies/evidence/activities/officers/kpis)
│   │   └── insert.py            # dataset → Pony entities in one db_session; idempotent gates (SEED_DEMO)
│   └── features/
│       ├── auth/                # router(POST /auth/login, GET /auth/me) · service(verify+mint) · repo(officer lookup) · schemas
│       ├── works/               # router(list/get/dossier/peers) · service(lens/scope/assembly) · repo · schemas(WorkOut…)
│       ├── anomalies/           # router(list/get/recompute) · service · repo · schemas
│       │   └── engine/          # pipeline.py (load→run→persist→bump) + cost/delay/duplicate/expenditure/utilisation.py (pure pandas) + registry.py
│       ├── evidence/            # router(multipart up/down) · service(allowlist, size cap, storage) · repo · schemas
│       ├── decisions/           # router(POST decision) · service(+transactional activity append) · repo · schemas
│       ├── notifications/       # router · service(derivation rules, cached) · repo
│       ├── overview/            # router(kpis/geo/queue) · service(cached read models) · repo
│       └── copilot/             # router(search/compare/explain/missing) · service(reuses works+anomalies repos) · schemas
└── tests/
    ├── conftest.py              # test app fixture, throwaway Postgres db, seeded once per session
    ├── fixtures/ts-demo-dataset.json   # committed dump of mplads-mock.ts output (regen script: scripts/dump-ts-fixture.ts)
    ├── test_seed_parity.py      # §8 of seed-generator.md — the tripwire
    ├── test_detectors.py        # pure pandas fns vs pinned formulas
    ├── test_auth.py             # login/me/401/403
    └── test_contract_*.py       # per feature: response JSON key-for-key vs api-reference.md
```

Dependencies (one direction): `features → common, core`; `core/config ← everything`;
`features/X` may import `features/Y/repo` only via Y's exported allowlist (read joins).
Cross-feature service imports are forbidden (structure.md).

## 3. Request/response law (how we talk to the frontend)

**Inbound**: every route declares typed params — query/filter models via `Depends()`,
bodies as Pydantic models, path params typed. Validation is Pydantic's job, never
manual `if`-checking; malformed input → FastAPI's 422 body. Multipart evidence
upload: `file: UploadFile` + `kind: EvidenceKind`.

**Outbound** (the four rules that keep `mplads-schema.ts` byte-compatible):

1. **camelCase wire, snake_case code.** All response models inherit `CamelModel`
   (`alias_generator=to_camel, populate_by_name=True`); FastAPI serializes
   `response_model` by alias by default. One base, zero per-field `Field(alias=…)`.
2. **Money is integer rupees, dates are `yyyy-MM-dd` strings, timestamps are ISO-8601
   UTC ending in `Z`** (`.000Z` style). `date` fields serialize correctly natively;
   datetimes get a shared `field_serializer` in `CamelModel`. Money converts to
   `int` in `*Out` schemas (frontend numbers).
3. **Envelopes** (api-reference.md §pagination): works ledger → `Page[WorkOut]`
   (`items/total/page/pageSize`); every other list → `ItemsOut[T]` (`items/total`).
4. **Errors**: `{"detail": "…"}` only — `AppError` subclasses carry status + message;
   one handler registers them all; unknown exceptions → request-id-logged 500 with a
   generic detail (ssdlc: no internals leaked).

**Status codes**: 200 read · 201 created (decision, evidence) · 400 malformed ·
401 no/bad token · 403 out-of-scope or role-lacking · 404 unknown-or-out-of-scope
read · 422 validation · 500 unhandled. Scope reads 404 (don't confirm existence),
scope writes 403 (deliberate, per Feature_docs/01-login/backend.md).

**Serialization must happen inside the request's `db_session`** — Pony detaches
entities when the session closes. Repos return entities, services map to `*Out`
via `from_entity()` before returning. (Implementation rule; the #1 Pony-in-FastAPI trap.)

## 4. Error & logging strategy (debuggability before code)

- `AppError(message, status)` → `NotFoundError`, `ScopeForbiddenError`, `AuthError`.
  Raised anywhere below the router; caught only by the central handler.
- Request-id middleware: uuid4 short id → response header `X-Request-Id` + every log line.
- stdlib logging (no structlog — minimum code): one formatter with request id, level,
  logger name. No `print`. No swallowed catches: pipeline catches `DetectorError`
  per analytics-cache.md §5 (abort whole recompute, log, re-raise as AppError 500).
- `PipelineReport` logged on every recompute (per-detector counts, duration, versions).

## 5. SSDLC snapshot (Phase 1–3 gates; full list in ssdlc skill)

| Threat | Mitigation (enforced in code) |
|---|---|
| Spoofing | HS256 JWT, signature+exp verified per request; bcrypt (direct lib) for the 3 demo officers |
| Elevation | scope predicate in SQL inside every repo read; write-scope check in services — never client-supplied role |
| Tampering | upload allowlist (pdf/jpg/png/webp) + 5 MB cap + random hex storage names under UPLOAD_DIR |
| Disclosure | generic error bodies, request-id'd server logs, `.env` gitignored, `.env.example` placeholders only |
| Repudiation | activities table = append-only audit (decisions write decision+activity in one transaction) |
| DoS | pageSize ≤ 100, anomaly limit ≤ 200, upload size cap; no public write endpoints |

Dependencies pinned via `uv.lock` (SCA gate); `pip-audit`/`uv audit` run before merge.

## 6. Verified toolchain decisions (checked on this machine, 2026-09-15)

- Python **3.13**, uv **0.12.5**, Docker w/ Compose v5 — all present. Postgres 16 runs
  in compose; app runs via `uv run uvicorn` locally during the build.
- **bcrypt used directly, not passlib**: passlib 1.7.4 (2020, unmaintained) breaks with
  bcrypt ≥ 4.1 (reads a removed `__about__` module). Minimum-code law: `bcrypt.hashpw`/
  `bcrypt.checkpw` are two calls; passlib adds nothing. *(Deviation from README stack
  table — logged as ADR-030.)*
- `python-jose[cryptography]`, `pony`, `pandas` per locked stack — import-verified at
  scaffold time (todo gate); any failure gets documented + an ADR before substitution.
- Alembic migrations are **hand-written SQL** (`op.execute`), because Alembic
  autogenerate requires SQLAlchemy metadata, which we deliberately don't have (Pony).

## 7. Work packages (agent-ready; each has files + acceptance criteria)

| # | Package | Files | Done when |
|---|---|---|---|
| WP0 | Scaffold | pyproject, uv.lock, .env.example, main.py, core/config, common/errors+schemas+pagination, Dockerfile, compose, /healthz | `uv run uvicorn` boots; `/healthz` 200; `uv run pytest` collects |
| WP1 | Data layer | core/db.py (7 entities), alembic 0001_init, compose postgres up | `alembic upgrade head` creates tables |
| WP2 | Seed port | seed/rng.py, generate.py, insert.py, test_seed_parity.py, fixture | parity test green: 144 works/24 anomalies/6 evidence/65 activities byte-deep vs TS fixture |
| WP3 | Auth | core/security, core/deps, features/auth/*, officers in seed | login → token → /auth/me; 401 bad creds; district officer 403 out-of-scope write |
| WP4 | Works | features/works/* | GET /works matches lens/sort/page contract; dossier one-call bundle; peers table |
| WP5 | Engine | features/anomalies/* + engine/* | 5 detectors unit-tested vs formulas; recompute replaces in tx + bumps version; A-1 pinned strings |
| WP6 | Writes | features/evidence/*, features/decisions/* | upload stored+row 201; decision appends activity same-tx |
| WP7 | Read models | features/notifications, overview, copilot + caching.py wired | notifications derivation exact; geo/queue/kpis cached; copilot tools alias services |
| WP8 | Contract suite | test_contract_* | full `uv run pytest` green incl. parity |

Dependency order: WP0 → {WP1 → WP2, WP3} → {WP4, WP5, WP6} → WP7 → WP8.
WP2's pure generation math needs only WP1's entity names (tests run DB-free until insert).
Each package is self-contained enough to hand to a separate agent with its spec files —
that is the parallelization seam; executed sequentially here with batched writes.

## 8. Extensibility seams (where the future plugs in without rewrites)

- **New detector** → new `engine/<name>.py` + one `DETECTORS` entry + `DETECTOR_VERSION`
  bump. Pipeline, storage, API untouched (Registry pattern).
- **Real ingest** (eSAKSHI-shaped payloads) → `WorkIn` ingest route → validate → insert
  → `pipeline.run()` per analytics-cache.md data flow. Seed stays as demo fixture.
- **LLM later** → `/ai/chat` calls the same feature services the copilot tool endpoints
  expose; no new data layer.
- **Cache → Redis** → same `cached()` signature, different backend; call sites unchanged.
- **Multi-district officers** → `officer_districts` join table (already noted in
  data-model.md); only `OfficerClaims` scope resolution changes.
- **New feature** → new `features/<name>/` folder + one `include_router` line.

## 9. Build order (this session)

WP0 → WP1 (+compose up) → WP2 (parity first — the tripwire) → WP3 → WP4 → WP5 →
WP6 → WP7 → WP8 → context sync (ADR-030+, flow.md, progress-tracker.md).
Every package ends with its tests passing before the next begins.
