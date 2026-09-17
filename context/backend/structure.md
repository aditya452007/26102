# Backend Structure — Feature-first, Controller → Service → Repository

> How code is organized when `backend/` is implemented. Every feature is a self-contained
> vertical slice; within a slice, code flows in one direction only:
> **router (controller) → service → repository → entities**. A layer may only call the layer
> directly below it — never skip, never reach sideways, never call upward.
>
> ORM is **Pony ORM** (user decision, ADR-027) — chosen for minimum lines of code: queries are
> plain Python generator expressions, entities are declarative classes, no session factory
> boilerplate. Trade-off accepted: Pony is sync, so DB work runs in FastAPI's threadpool
> (§Async boundary).

## Directory layout (feature-first)

```
backend/app/
├── main.py                  # FastAPI factory; mounts each feature router under /api/v1
├── core/
│   ├── config.py            # pydantic-settings: DATABASE_URL, JWT_SECRET, DEMO_TODAY_ISO…
│   ├── security.py          # bcrypt hash/verify, JWT issue/decode, role dependencies
│   └── db.py                # Pony db object, entity bindings, db_session provider
├── common/
│   ├── errors.py            # AppError hierarchy + handlers → { "detail": "…" } shape
│   ├── pagination.py        # shared page/page_size params + envelope
│   └── caching.py           # versioned lru_cache decorator (analytics-cache.md §4)
└── features/                # ONE FOLDER PER FEATURE — nothing outside knows a feature's guts
    ├── auth/
    │   ├── router.py        # POST /auth/login  (controller: parse → service → status)
    │   ├── service.py       # verify credentials, mint JWT, build claims
    │   ├── repo.py          # Officer queries (only layer importing Officer entity)
    │   └── schemas.py       # LoginIn, TokenOut (Pydantic)
    ├── works/
    │   ├── router.py        # GET /works, /works/{id}, /works/{id}/dossier, /works/{id}/peers
    │   ├── service.py       # lens semantics, scope filters, dossier assembly
    │   ├── repo.py          # Work queries via Pony
    │   └── schemas.py       # WorkOut, DossierOut, PeersOut (mirror mplads-schema.ts)
    ├── anomalies/
    │   ├── router.py        # GET /anomalies, POST /detectors/recompute
    │   ├── service.py
    │   ├── repo.py
    │   ├── schemas.py
    │   └── engine/          # analytics engine — own package (analytics-cache.md)
    │       ├── pipeline.py  # DataFrame load → run detectors → persist → bump version
    │       ├── cost.py      # one file per detector, pure pandas fns (no I/O)
    │       ├── delay.py
    │       ├── duplicate.py
    │       ├── expenditure.py
    │       └── utilisation.py
    ├── evidence/            # router (multipart), service (storage), repo, schemas
    ├── decisions/           # router, service (transactional activity append), repo, schemas
    ├── notifications/       # router, service (derivation rules), repo, schemas
    ├── overview/            # router, service (KPIs/geo/queue via cached analytics), repo, schemas
    └── copilot/             # router (4 tool endpoints), service, repo, schemas
```

**Feature-first rule**: adding a feature = adding one folder; deleting a feature = deleting one
folder. Shared code lives only in `core/` + `common/`. A feature may import from `core/`,
`common/`, and — for read joins — another feature's **repo functions exposed explicitly**
(exported list at the bottom of each `repo.py`); it must never import another feature's
service or router.

## Layer contract (the law)

### 1. Router (controller) — thin, no business logic

Responsibilities: declare route + auth dependency, parse/validate input (Pydantic does it),
call exactly one service function, map result + `AppError` to HTTP status. Target ≤ 15 lines
per route.

```python
@router.get("/works", response_model=Page[WorkOut])
def list_works(
    filters: WorkFilters = Depends(),
    officer: OfficerClaims = Depends(current_officer),
):
    """No try/except — the AppError handler in common/errors.py maps exceptions."""
    return works_service.list(filters, officer)
```

### 2. Service — all business logic

Lens semantics, scope enforcement, dossier assembly, detector orchestration, notification
derivation, cache reads. Services are plain functions, take primitives/Pydantic models (never
Pony entities) and return Pydantic models — this is what makes them testable without a DB and
keeps the response contract in one place.

### 3. Repository — the only layer that talks Pony

Each repo exposes small, named query functions. Pony's generator-expression syntax keeps these
to 3–6 lines each; the five hot queries:

```python
# works/repo.py
def page_for(officer_scope, f: WorkFilters) -> tuple[list[Work], int]:
    query = select(w for w in Work
                   if w.state in officer_scope.states
                   and w.district in officer_scope.districts
                   and (f.state is None or w.state == f.state)
                   and (f.q is None or f.q.lower() in w.title.lower()))
    rows = query.page(f.page, f.page_size)          # ← pagination in one call
    return rows, query.count()

# works/repo.py — peer group: same type + same state, excluding self (data-model.md §works)
def peer_group(work: Work) -> list[Work]:
    return select(w for w in Work
                  if w.type == work.type and w.state == work.state
                  and w.id != work.id and w.id != None)[:]   # N/A rows excluded at ingest

# notifications/repo.py — stalled: >90d no update (DEMO_TODAY, never date.today())
def stalled(scope, today: date, days: int = 90):
    return select(w for w in Work
                  if w.status != "completed"
                  and (today - w.last_update).days > days
                  and w.state in scope.states)[:]
```

### 4. Entities — Pony declarative models, mirror of `data-model.md`

```python
class Work(db.Entity):
    id = PrimaryKey(str)            # "W-1014"
    title = Required(str)
    type = Required(str)            # road|community-hall|water|school|drainage|streetlight
    state = Required(str); district = Required(str); agency = Required(str)
    status = Required(str)          # in-execution|completed|sanctioned|stalled
    sanctioned_lakh = Required(Decimal); expenditure_lakh = Required(Decimal)
    progress_pct = Required(int)
    sanction_date = Required(date); due_date = Required(date); last_update = Required(date)
    anomalies = Set(Anomaly)        # navigation only — reads go through repos
```

Entities live in `core/db.py` (single binding, per data-model.md's 7 tables) — one place, not
per-feature, because Pony requires entities registered on the `db` object before
`generate_mapping()`.

## Pony ORM in FastAPI — the async boundary

Pony is synchronous; FastAPI handlers above are plain `def`, so Starlette already runs them in
its threadpool — **no manual `run_in_threadpool` needed**, no `async def` in routers/services/
repos anywhere in v1. Rules:

- `db_session` wraps every request via a dependency (`Depends(unit_of_work)`); writes commit at
  request end, roll back on `AppError`.
- The detector pipeline (bulk compute + replace) takes its own `db_session(serialized=True)` —
  Pony's optimistic-update-free serial mode for multi-row transactions (recompute semantics,
  anomaly-engine.md §Recompute).
- Concurrency model: Postgres does the locking; Pony's flush-on-attribute-set is fine at demo
  scale (40 works). Revisit only if real ingest changes the profile.

## Response mapping (Pony → Pydantic)

The wire contract belongs to `mplads-schema.ts`; Pydantic models in each feature's `schemas.py`
are its server twin. Mapping is explicit — one `from_entity` classmethod per schema, no magic
`from_orm` inheritance chains:

```python
class WorkOut(BaseModel):
    id: str; title: str; type: WorkType; state: str; district: str; agency: str
    status: WorkStatus
    sanctionedLakh: float; expenditureLakh: float; progressPct: int
    sanctionDate: date; dueDate: date; lastUpdate: date
    stalledDays: int | None = None

    @classmethod
    def from_entity(cls, w: Work, today: date) -> "WorkOut":
        return cls(**_snake_to_camel(w.to_dict()),   # Pony gives the dict free
                   stalledDays=_stall_days(w, today))
```

Contract tests (`tests/test_contract_*.py`) assert these schemas against the examples in
`api-reference.md` — a field added on one side without the other fails CI.

## Dependency flow diagram

```
router ──calls──▶ service ──calls──▶ repo ──queries──▶ Pony entities ──▶ Postgres
   │                 │                                      
   │ Depends:        │ imports:                    │ imports:
   │ current_officer │ common.caching              │ core.db entities
   │ unit_of_work    │ features/*\.repo (read-only)│
   ▼                 ▼
Pydantic in/out everywhere at the router/service boundary
```

Anti-patterns this layout forbids: `select(` outside `repo.py`; HTTP status codes in services;
business `if` statements in routers; `async def` route handlers (v1); entities escaping a
feature (always convert to `*Out` schemas before returning).
