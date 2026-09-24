# Decision Log

> **Purpose**: The "why" file. An **append-only** log of every meaningful decision —
> which library was chosen and why, architecture choices, feature decisions, branch
> decisions, tradeoffs. When anyone (human or AI) wonders "why is it built this way?",
> the answer is here.
>
> **Update rule (MANDATORY)**: Append a new entry for EVERY meaningful decision.
> **Never edit or delete past entries** — that would rewrite history and break the
> log's purpose. Before making a new decision, check this log first (don't decide
> twice).

---

## What counts as a "meaningful decision"? (MANDATORY — log all of these)

- **Library / framework / tool choice** — component library, icon set, state manager, animation lib, styling approach
- **Architecture / pattern choice** — folder structure, data flow, error strategy, server vs client components
- **Feature design decisions** — scope, UX, API shape, data model
- **Branch / workflow decisions** — git flow, release process, deployment target
- **Anything you had to think about for more than ~5 seconds**

---

## How to add a decision

1. Copy the **Template** below into the **Decision Entries** section (newest on top)
2. Fill it in — the **Why** line is the most important part
3. Add a row to the **Decision Index** table
4. If it supersedes an earlier decision, mark the old one as `Superseded by ADR-NNN`

---

## Decision Index

| ID | Date | Decision | Status | Affects |
|----|------|----------|--------|----------|
| ADR-036 | 2026-09-24 | District-less polygons resolve to state name + state counts; clicks stay district-only | Accepted | india-geo.ts, overview data.ts/india-risk-map.tsx/route.tsx |
| ADR-035 | 2026-09-24 | Map empty-states + 144-work sample + full rupee migration (contract, seed, entities, engine, UI, docs); supersedes ADR-034 lane + bumps 010 pageSize 100→200 | Accepted | mplads-schema/mock, overview/*, india-geo, server/mplads, backend seed/db/engine/tests, alembic 0002, all backend docs, Feature_docs 00–05 |
| ADR-034 | 2026-09-24 | Backend money migrates lakh-float → rupee-int (wire `*Rs` ints, `unit "₹"`, `round_10k` medians, ₹10L guard = 1000000); sibling worker owns entities/helpers/seed | Accepted (lane record; completed end-to-end by ADR-035) | backend/app/features/{works,anomalies,overview}/**, engine/*, tests/test_{detectors,contract_*} |
| ADR-033 | 2026-09-19 | Overview backend-first with seed fallback: single /healthz probe per visit, Zod-validated bundle server fn returning { ok:false } on any failure, demo-ministry server login, role lens stays client-side | Accepted | admin-dashboard/src/server/mplads/*, dashboard/overview/* |
| ADR-032 | 2026-09-16 | No db_session yield-dependency (Pony×FastAPI thread-local law): services own their transactions; flush before serializing auto PKs; omit null `note` keys per Zod optional law | Accepted | core/deps.py, all 8 routers, decisions repo/schemas, admin-dashboard/scripts/verify-api-contract.ts |
| ADR-031 | 2026-09-16 | Peer-statistics honesty: seeded peerN/peerMedianLakh are demo fiction; real peer groups = (type, state) with n≥8; recompute replaces stored flags with honest computation; dossier omits peers block | Accepted | works feature, anomalies engine, api-reference.md §peers, seed-generator.md |
| ADR-030 | 2026-09-16 | Backend v1 implemented green (52 tests): feature slices, Pony entities with nullable=True law, hand-written Alembic DDL, pandas detector registry, versioned lru_cache; seeder OWNS its transactions — callers never wrap it in db_session | Accepted | backend/**, tests/**, implementation-plan.md |
| ADR-029 | 2026-09-14 | Feature-first backend specs added per frontend feature (Feature_docs/01–05 backend.md) | Accepted | Feature_docs/01-login/backend.md … 05-ai-copilot/backend.md |
| ADR-028 | 2026-09-14 | Auth v1: JWT bearer (HS256, 1 h, role+scope claims), no refresh/register/logout endpoints | Accepted | Feature_docs/01-login/backend.md, core/security.py (future) |
| ADR-027 | 2026-09-14 | Backend stack amended: Pony ORM (sync via threadpool) + pandas analytics + versioned lru_cache (supersedes ADR-025's SQLAlchemy async choice) | Accepted | context/backend/structure.md, analytics-cache.md, README.md, data-model.md |
| ADR-026 | 2026-09-14 | Backend code structure: feature-first controller→service→repository, one folder per feature | Accepted | context/backend/structure.md |
| ADR-025 | 2026-09-14 | Backend foundation: FastAPI + Postgres + rule-based detectors, documented in context/backend/ on branch 009-backend-foundation (no ML, no LLM yet; JWT+RBAC; seeded generator port; compute+store detectors; server-fn proxy integration) | Accepted | context/backend/**, future backend/ package, frontend server fns (later) |
| ADR-024 | 2026-09-09 | Rebrand display to NIRIKSHAN-AI (display-only, copilot→NIRIKSHAN, package.json untouched) | Accepted | app-config, manifest, auth v2 panel, chat, page-assistant, dossier, mock |
| ADR-023 | 2026-09-08 | Auth shell on branch `20260908-auth-shell`: v2 login/register default (v1→v2 shims), prototype cookie session + dashboard guard, new Notifications + Settings pages | Accepted | auth routes, session store, dashboard shell, sidebar, page-assistant |
| ADR-017 | 2026-09-07 | Dev-only `agentation@3.0.2` visual-feedback overlay mounted in root shell (NODE_ENV-gated) | Superseded by ADR-018 | package.json, routes/__root.tsx |
| ADR-018 | 2026-09-07 | Remove agentation (duplicate-React hook crash); adopt template chat as Sentinel Copilot page + sidebar entry | Accepted | routes/(main)/chat/**, sidebar-items.ts |
| ADR-019 | 2026-09-07 | Assistant becomes anchored popover drawer with free-text input + localStorage persistence; Enter-to-send in composers | Accepted | page-assistant, chat thread |
| ADR-020 | 2026-09-07 | Reinstall agentation with Vite resolve.dedupe for single React copy (fixes hook crash) | Accepted | package.json, vite.config.ts, routes/__root.tsx |
| ADR-021 | 2026-09-07 | works/route.tsx had no Outlet so $workId dossier never rendered; split into layout (Outlet) + index (ledger) | Accepted | dashboard/works/route.tsx, index.tsx |
| ADR-022 | 2026-09-07 | Dossier redesign: KPI strip + map/tender command row, inline assistant removed (Ask-AI popover via mplads:ask-ai event), enriched flags, financials KPI row deleted | Accepted | works/$workId/**, page-assistant |
| ADR-016 | 2026-09-07 | Parallel worktree lanes (A/B/C/D) merged conflict-free into 006, build after each merge | Accepted | git workflow, 006-officer-workspace |
| ADR-015 | 2026-09-07 | Single MPLADS sidebar group (8 links) + floating page-level Ask-AI toggle on every dashboard page | Accepted | sidebar-items.ts, dashboard shell, page-assistant |
| ADR-014 | 2026-09-07 | Adopt template pages in place (finance/analytics/tasks/calendar/file-manager/invoice) — relabel + rebind to mock, layouts untouched | Accepted | 6 template screens |
| ADR-013 | 2026-09-07 | Extend Work contract: tenderHolder/tenderAwardedBy/department/labourDeployed/demandedDays/returnedLakh, separate rng stream | Accepted | mplads-schema.ts, mplads-mock.ts |
| ADR-012 | 2026-09-07 | SPEC 03: URL-owned filters + table-local checks, plain anchors to dossier, no fake skeleton, relative Updated sub-line | Accepted | dashboard/works |
| ADR-011 | 2026-09-07 | Blank-map root cause: wrongly-wound fit bbox → world-scale projection; adopted React-19-native simple-maps fork with verified fit | Accepted | overview india-risk-map, package.json |
| ADR-010 | 2026-09-07 | SPEC 02 polish: ministry-first default, CRM outline badges, visible map error+retry | Accepted | role store, overview components |
| ADR-009 | 2026-09-07 | SPEC 02: vendored 2015-vintage states GeoJSON (slimmed, GeoJSON not TopoJSON), plain-Table queue, SVG-anchor map selection, Bhopal scope | Accepted | dashboard/overview, public/geo, role store |
| ADR-008 | 2026-09-07 | SPEC 01: overview under dashboard shell, interim stub, validation kept, standalone role store on existing cookie fns | Accepted | dashboard routes, header, src/stores/role/ |
| ADR-007 | 2026-09-07 | SPEC 00 mock contract: seeded mulberry32 + fixed demo date, derived geo rollup, INR/lakh helpers on existing idioms | Accepted | admin-dashboard/src/lib/mplads-schema.ts, mplads-mock.ts |
| ADR-006 | 2026-09-06 | SIH MVP: 5 routes, reuse template components (not structure), UI-first prototype on mock data | Accepted | admin-dashboard/, all context files |
| ADR-005 | 2026-09-06 | Skip Impeccable install after npm ECOMPROMISED refusal; do not --force | Accepted | repo root tooling |
| ADR-004 | 2026-09-06 | Initial dashboard setup: neutral naming, placeholder demo data, pruned docs | Accepted | admin-dashboard/ (docs, config, demo data) |
| ADR-003 | 2026-08-11 | Remove Scaffold.py; canonical trees are the source of truth | Accepted | repo root, folder-structure skill |
| ADR-002 | 2026-08-11 | Add flow.md + decision.md as living context files | Accepted | context/, all docs |
| ADR-001 | YYYY-MM-DD | [One-line decision] | Accepted | [files/features] |

---

## Template

### ADR-NNN: [Short title]
- **Date**: YYYY-MM-DD
- **Status**: Proposed | Accepted | Rejected | Superseded by ADR-NNN
- **Context**: [what triggered this decision — the problem being solved]
- **Options considered**: [alternatives, and why each was rejected]
- **Decision**: [what was chosen]
- **Why**: [the reasoning — this is the important part. Write enough that a future agent
  understands without re-deriving it.]
- **Consequences**: [positive and negative effects, things to watch out for]
- **Affects**: [features / files / branches this touches]

---

## Decision Entries

### ADR-036: District-less polygons resolve to state name + state counts (Unknown-area fix)
- **Date**: 2026-09-24
- **Status**: Accepted
- **Context**: Page feedback on `/dashboard/overview?district=Unknown`: hovering showed `Unknown area · no works in demo sample`. Root cause: 34/760 GeoJSON features have no `district` prop (state remainders); `districtLabel()` had no state fallback.
- **Options considered**: Seeding works into more districts (rejected — geometry/dataset churn for a label bug); making remainder polygons hover-only with state text but grey fill (rejected — color carries the risk signal, same helper costs one line).
- **Decision**: `districtLabel()` returns `st_nm` when `district` is absent; new `scopedStateGeo()` rollup flows to the map as `states`; remainder polygons tooltip + fill from their state aggregate; clicks remain district-only. Zero-work states read `State · no works in demo sample` — named, never unknown.
- **Why**: The polygon *is* state territory, so state counts are the honest content; a click would set a `?district=` filter that matches nothing.
- **Consequences**: `getOverviewData*` return shape gains `states`; no contract/schema change.
- **Affects**: `india-geo.ts`, overview `data.ts` / `india-risk-map.tsx` / `route.tsx`, flow.md triage line.

### ADR-035: Map empty-states + denser sample + rupee-integer money (full scope)
- **Date**: 2026-09-24
- **Status**: Accepted
- **Context**: User report: the risk map renders bare grey for districts with no demo data (no state name, "nothing"); the 40-work sample leaves the 760-district map looking empty; lakh-float money (`₹58.9L`, scheme exposure `₹41L`) is not government-credible — eSAKSHI stores integer rupees and the scheme talks crores. Asked for a spec first; approved SPEC rev 2 (144 works, display-vs-store vote: store-rupees-now, empty-click filters, rescaled KPIs).
- **Options considered**: Tooltips only, no density change (rejected — map still sparse); display-only crores keeping lakh columns (rejected by user vote — eSAKSHI truth is rupees); dual lakh+crore columns (rejected — dual-write transition for a demo seed); new districts added to GeoJSON (rejected — 12×12 round-robin densifies without new geometry).
- **Decision**: (1) Map: `districtLabel()` in `india-geo.ts`, 3-tier tooltips, `No works in sample` legend, empty click → `?district=` + All-clear card. (2) Sample: 144 works / 24 flags (FLAG_PLAN doubled, statuses 66/26/26/25), flagship pinned, storage key `mplads-demo-v2`. (3) Money: Zod `*Rs int` + `unit "₹"`, TS `formatMoneyRs`/`round10k`, Pony `BIGINT`, Alembic `0002_rupees` (×100000 USING conversion), engine `round_10k` medians + `sanctioned_rs >= 1000000` guard (₹10L floor, real-terms unchanged), ratios untouched (unit-invariant), KPIs `{28410, 9120, 1140, 214, 1284000000}`, `pageSize` cap 100→200 (144 rows need one page; 010's `pageSize=100` updated to 200), fixture regenerated (144/24/6/65). Docs synced: data-model, seed-generator, api-reference, anomaly-engine, analytics-cache, structure, implementation-plan, verification-plan, Feature_docs 00–05.
- **Why**: Grey-no-label reads as broken, not empty — naming every polygon keeps the jury oriented; integer rupees make the mock→real swap honest (no float paise, ever); one adaptive formatter keeps every screen consistent; the migration is atomic (parity test + 52-suite prove both sides moved together).
- **Consequences**: Old `mplads-demo-v1` localStorage decisions are orphaned (key bump, demo-only); recompute at demo scale still yields ~0 flags (peer groups ~4 < 8 — ADR-031 stands); dossier `peers`-block doc drift in api-reference pre-dates this and stays open (progress-tracker Next Up #3). Biome format noise is repo-wide CRLF, proven on untouched files — not churned.
- **Affects**: `mplads-schema.ts`, `mplads-mock.ts`, overview `-components/*`, `india-geo.ts`, `server/mplads/overview.ts`, all works/dossier/copilot/finance/analytics/invoice readers, backend seed/db/engine/services/tests, `0002_rupees`, every backend doc, Feature_docs 00–05. Supersedes ADR-034 (lane record) into the completed whole.

### ADR-034: Rupee-integer money (mechanical lakh→Rs migration, split-worker)
- **Date**: 2026-09-24
- **Status**: Accepted
- **Context**: Wire/seed mock move to integer rupees; backend services/schemas/engines/tests must match character-for-character while another worker migrates entities/helpers/seed.
- **Options considered**: Big-bang single-worker migration (rejected — task split across two workers by design); float-rupees (rejected — contract says int/BIGINT).
- **Decision**: `*_rs`/`*Rs` ints, `unit: "₹"`, `round_10k` for money medians, `sanctioned_rs >= 1000000` guard, `overrunExposureRs: 1284000000`, pinned W-1014/A-1 values; `one_decimal` stays only for stallDays progress math.
- **Why**: Ratios are unit-invariant so formulas don't change; rounding/display live in the sibling worker's helpers, keeping this lane a pure rename.
- **Consequences**: Suite red until the sibling lane lands (`round_10k`/`format_money_rs`/`sanctioned_rs` attrs/seed values); `PeerRowOut` floats accept ints so its schema is untouched.
- **Affects**: backend/app/features/{works,anomalies,overview}/**, engine/*, tests/test_{detectors,contract_*}

### ADR-033: Overview backend-first, seed-fallback (no screen-of-death)
- **Date**: 2026-09-19
- **Status**: Accepted
- **Context**: Frontend ran purely on `mplads-mock.ts` seed while FastAPI+Postgres sat unwired; user wants live data when the backend is up and instant seed when it is not, with exactly one health check per visit (never a retry storm) and no dead/error screens.
- **Options considered**: Delete the seed and fetch live always (rejected — backend-down = broken demo); per-API try/catch with no probe (rejected — N hanging timeouts per page); client-side probe + direct browser→API fetch (rejected — splits the data path; server-fn proxy is the ADR-025 law); cross-visit cached verdict (rejected — stale if the backend starts later; per-visit single-flight probe costs ~0 ms when refused).
- **Decision**: `server/mplads/api-client.ts` (1.5 s timeout fetch, single-flight `probeBackend()`, cached demo-ministry login, retry-once on 401) + `server/mplads/overview.ts` bundle fn (`/overview/kpis` + `/works?pageSize=100` + `/anomalies?limit=200`, Zod-parsed, `{ ok:false }` on ANY failure — never throws) + overview loader renders live derivation or seed derivation. Backend `/overview/geo|queue` deliberately NOT used: geo is state-level (UI needs district slices) and queue rows lack full anomaly detail — joining works+anomalies client-side reuses the exact seed derivation with zero component changes. Server always scopes as ministry; the header role lens filters locally as before. Silent (no live/demo badge) per user vote.
- **Why**: One cheap probe replaces N timeouts; `{ ok:false }` makes fallback a type-level guarantee instead of scattered try/catch; reusing the seed derivation means live and seed paint pixel-identical shapes.
- **Consequences**: New env knobs `NIRIKSHAN_API_URL` (default `http://localhost:8000`), `NIRIKSHAN_DEMO_EMAIL/PASSWORD` (defaults ministry/demo1234 — demo only). Pattern to replicate for Works/Dossier next.
- **Affects**: admin-dashboard/src/server/mplads/*, dashboard/overview/route.tsx, overview/-components/data.ts + kpi-strip.tsx

### ADR-032: No db_session yield-dependency — services own transactions (Pony × FastAPI concurrency law)
- **Date**: 2026-09-16
- **Status**: Accepted
- **Context**: Live curl verification (`context/backend/api-verification-plan.md`) produced intermittent 500s on concurrent GETs that the sequential pytest suite never reproduced. Uvicorn tracebacks showed Pony's teardown assertion `assert not local.db_context_counter`.
- **Root cause**: the `unit_of_work` yield-dependency opened `db_session` in dependency code, and FastAPI runs sync dependency enter/exit through `run_in_threadpool` — under concurrent requests the exit can land on a DIFFERENT worker thread than the entry. Pony sessions are thread-local, so the per-thread session counter leaked.
- **Options considered**: keep the dependency and serialize requests (rejected — defeats the threadpool); switch to async SQLAlchemy (rejected — ADR-027); make each service own its sessions (chosen).
- **Decision**: Delete `unit_of_work`/`DbSession` entirely. Services wrap Pony access in `with orm.db_session:` blocks, which enter and exit on the calling thread. Recompute keeps its own serializable transaction outside any request session. Two adjacent contract bugs fixed in the same pass: `create_with_activity` now calls `orm.flush()` so auto PKs serialize as real values (decision id was literally `"None"`), and `ActivityOut` OMITS null `note` keys (`activitySchema.note` is Zod `string.optional()` — absent, never null).
- **Why**: Thread-safety by construction beats thread-safety by discipline; session lifetime == service call, so entities never outlive their session and serialization always happens inside it.
- **Consequences**: There is no request-wide transaction — a flow calling several services would commit separately (no such flow today). Proven: 52 tests green + 12-simultaneous-request curl hammer all 200 + 0 tracebacks.
- **Affects**: core/deps.py, all 8 feature routers, decisions/repo.py, decisions/schemas.py, admin-dashboard/scripts/verify-api-contract.ts

### ADR-031: Peer-statistics honesty — seed fiction vs. real computation
- **Date**: 2026-09-16
- **Status**: Accepted
- **Context**: While building the works feature, the dossier/peers contract tests exposed that the TS mock's `peerN: 18` / `peerMedianLakh` values are rng-authored narrative — the generator never computes peer groups. Real type+state peer groups for e.g. W-1014 hold 1 work, and no (type, state) group in the 40-work dataset reaches the n≥8 invariant.
- **Options considered**: Keep the fiction in the API (rejected — the backend must not lie about what it computed); block seeding of fabricated peer stats (rejected — the frontend dossier renders them today and parity demands the same demo dataset); silently keep both (rejected — undefined behavior once recompute runs).
- **Decision**: Keep the seed exactly parity-true (fiction included, `detector_version="rules-1.0-seed"`, `detector_inputs={}`). The API is honest going forward: `GET /works/{id}/peers` computes REAL (type, state) stats with the n≥8 invariant; `POST /detectors/recompute` replaces stored flags with real detector output (≈0 flags at demo scale — documented, expected); the dossier response OMITS the `peers` block because no frontend consumer reads computed peers (copilot `comparePeers` reads the stored anomaly's numbers).
- **Why**: Demo fiction may exist only as clearly versioned seed data; every computed value must come from the documented formulas. Consumers can distinguish seed rows (`rules-1.0-seed`) from real runs (`rules-1.0`).
- **Consequences**: After a recompute the demo UI shows far fewer flags until a reseed; `mplads-mock.ts`'s invented peer numbers are now documented as demo fiction in seed-generator.md; a future real dataset replaces them naturally.
- **Affects**: works feature, anomalies engine, api-reference.md §peers, seed-generator.md, tests/test_contract_works.py, tests/test_contract_anomalies.py

### ADR-030: Backend v1 implemented — as-built laws worth remembering
- **Date**: 2026-09-16
- **Status**: Accepted
- **Context**: All work packages (scaffold → data layer → seed parity → auth → works → anomalies engine → writes → read models) are implemented and the full suite is green (52 passed: parity, detectors, auth, works, anomalies, writes, read models contracts).
- **Options considered**: n/a — record of as-built laws discovered during implementation (this ADR exists so future agents don't rediscover them the hard way).
- **Decision**: (1) Pony `Optional(str)` silently defaults to `""` unless `nullable=True` is passed — the entities declare it everywhere; explicit `None` kwargs are rejected by this Pony version, so inserters omit them. (2) `insert_demo_data()` OWNS its transactions — wrapping callers in `db_session` nests sessions into one transaction and trips Pony's `CacheIndexError` on truncate+insert; three call sites were fixed to comply. (3) Recompute runs OUTSIDE the request's unit-of-work transaction (its own serializable transaction). (4) Test isolation = autouse fixture force-reseeds after every DB-backed test; officers are upserted (stable UUIDs) so JWT `sub` claims survive reseeds. (5) Alembic migrations are hand-written DDL (no SQLAlchemy metadata exists). (6) Detector math is pure pandas (registry pattern: one file per detector, pipeline owns I/O).
- **Why**: These are framework-level constraints (Pony/pytest/Docker on Windows) that contradict naive expectations; writing them down prevents regressions by the next agent.
- **Consequences**: None new — these laws are already encoded in code comments and tests; this ADR is their index.
- **Affects**: backend/app/seed/insert.py, backend/app/core/db.py, backend/tests/conftest.py, context/backend/implementation-plan.md

### ADR-029: Feature-first backend specs — one backend.md per frontend feature
- **Date**: 2026-09-14
- **Status**: Accepted
- **Context**: The backend doc set in `context/backend/` is endpoint-shaped; implementation agents also need each feature's endpoints IN feature context (what the screen does, why a rule exists), and the user wants docs organized feature-first like the code will be.
- **Options considered**: Keep everything in context/backend/ (rejected — separates a feature's backend rules from its frontend spec); one mega-spec (rejected — hard to navigate, user asked for feature-first).
- **Decision**: Each `Feature_docs/NN-*/` gains a `backend.md` alongside its `spec.md`: 01-login (JWT + RBAC), 02-overview (KPIs/geo/queue derivations), 03-works (filter/sort/pagination semantics), 04-work-dossier (bundle + evidence upload + transactional decisions), 05-ai-copilot (4 deterministic tool endpoints, no /ai/chat). These EXTEND `context/backend/` (wire shapes stay in api-reference.md) — they don't replace it.
- **Why**: An implementation agent reading a feature's folder gets frontend spec + backend contract together; cross-cutting concerns (data model, caching, structure) stay single-sourced in context/backend/ so they can't fork.
- **Consequences**: A contract change now has up to three homes to sync (mplads-schema.ts, api-reference.md, feature backend.md) — contract tests must fail until all agree.
- **Affects**: Feature_docs/01–05, context/backend/**

### ADR-028: Auth v1 — JWT bearer, role-scoped, deliberately minimal
- **Date**: 2026-09-14
- **Status**: Accepted
- **Context**: User's bar: "not very strict, but it has to work" — real auth connecting frontend and backend without over-engineering v1. Prototype cookie session (ADR-023) is demo-only.
- **Options considered**: Keep prototype cookie session (rejected — user chose JWT); JWT + refresh token (rejected — more endpoints than the bar requires); strict MFA/officer-portal integration (rejected — out of demo scope).
- **Decision**: `POST /auth/login` (bcrypt check → HS256 JWT, 1 h, claims sub/email/role/state_scope/district_scope) + `GET /auth/me`. No /register, /refresh, /logout endpoints (logout = client discards token). Three seeded demo officers (ministry / state-MP / district-Bhopal), password `demo1234`. Scoping enforced in repo queries from token claims, writes 403 out-of-scope, recompute ministry-only; reads 404 out-of-scope ids. Header role-switcher stays a view lens; token role is the authorization ceiling.
- **Why**: Bearer JWT is one dependency (`python-jose`), works for both server-fn proxy and future API clients, and makes the existing district/state/ministry lens real authorization with one `scope_of()` helper; deferring refresh keeps v1 at two endpoints.
- **Consequences**: Token expiry forces re-login after 1 h (acceptable v1); httpOnly-cookie transport can be adopted later without claim changes; multi-district officers need a future join table (data-model.md note).
- **Affects**: Feature_docs/01-login/backend.md, context/backend/README.md, future core/security.py

### ADR-027: Analytics engine = pandas + versioned lru_cache; Pony ORM for data access
- **Date**: 2026-09-14
- **Status**: Accepted
- **Context**: User asked for the analytics computation/caching approach, a "minimum lines of code" data layer, and named "ponytail" — clarified to **Pony ORM**.
- **Options considered**: Polars (rejected — overkill for thousands of rows); pure stdlib (rejected — more hand-rolled code, against the minimum-lines goal); SQLAlchemy async (superseded — more session boilerplate than Pony's generator-expression queries); Redis/cachetools (rejected — extra deps; a ~30-line lru_cache decorator covers v1); Postgres-stored rollups (rejected — second write path to keep in sync).
- **Decision**: Detector math is pure pandas functions (no I/O inside); the pipeline loads DataFrames via Pony, runs detectors, persists anomalies+signals in one transaction, then bumps an analytics version. Read models (geo rollup, queue, KPI, notifications, peer comparison) are cached with a `@cached(version, ttl)` lru_cache decorator — version bump invalidates everything at once, TTL 300 s covers drift. Pony ORM is sync; FastAPI handlers are plain `def` (threadpool) — no async anywhere in v1.
- **Why**: 3–4 chained pandas calls replace 3× the SQL window-function lines and unit-test without a DB; the versioned key gives correctness (bump on write) and liveness (TTL) with zero cache-library dependencies; Pony's generator expressions are the fewest-lines query syntax the user asked for, and Pony `select`/`page`/`count` eliminate pagination boilerplate.
- **Consequences**: Cache is per-worker (bounded by version+TTL — correct, revisit only for cross-worker coherence needs); Pony's sync engine requires the plain-`def` handler discipline (an `async def` route is a structure violation); banking-rounding law from seed-generator.md applies to detector math too.
- **Affects**: context/backend/structure.md, analytics-cache.md, README.md, data-model.md; supersedes the SQLAlchemy row of ADR-025

### ADR-026: Backend code structure — feature-first controller→service→repository
- **Date**: 2026-09-14
- **Status**: Accepted
- **Context**: User chose a modern service/repository/controller structure, feature-first, and simple enough to never clutter.
- **Options considered**: Layer-first layout (rejected — one feature's code scattered across four trees; user explicitly chose feature-first); repository-per-entity abstractions/interfaces (rejected — Java-style ceremony, more lines); putting detectors inside the anomalies feature service (rejected — engine gets its own package with pure pandas fns).
- **Decision**: `app/features/<feature>/{router,service,repo,schemas}.py` — routers ≤15 lines calling exactly one service fn; services take/return Pydantic models (never Pony entities); repos are the ONLY Pony-speaking layer; entities live in `core/db.py` (Pony needs one binding); shared code only in `core/`+`common/`; cross-feature reads go through explicitly exported repo functions. Anti-patterns banned: `select(` outside repo, HTTP codes in services, `async def` routes in v1.
- **Why**: Add/remove a feature = add/remove one folder; the layer law keeps responses' contract in schemas and business logic testable without a DB; matches the repo's existing feature-first frontend convention.
- **Consequences**: Small cross-feature import discipline to maintain (exported repo lists); Pony entities concentrated in one file by framework constraint, which slightly bends feature purity (documented, accepted).
- **Affects**: context/backend/structure.md, future backend/app/**

### ADR-025: Backend foundation documented in context/backend/ before any code
- **Date**: 2026-09-14
- **Status**: Accepted
- **Context**: Frontend is complete on mock data (SPEC 00–05 + 006–008); it is time for the real backend. User set the frame: Python FastAPI, Postgres, an analytics engine (rule-based, not ML), no LLM integration yet, and API documentation FIRST so implementation agents cannot hallucinate shapes or formulas. User answered six scoping questions (2026-09-14).
- **Options considered**: Doc format — OpenAPI-first or single spec file (rejected — user chose a Feature_docs-style doc set under context/backend/); auth — defer or minimal session (rejected — JWT + district/state/ministry RBAC chosen, making the frontend's role lens real authorization); seed — static JSON fixture or fresh ingest (rejected — porting the mulberry32 generator to Python keeps the demo byte-identical, making the mock→real swap seamless); detectors — live SQL on every request (rejected — heavier) or background job queue (rejected — extra infra) — compute+store at ingest chosen; stack — sync/pip (rejected) — async SQLAlchemy 2.0 + uv + Docker Compose chosen; client integration — browser-direct with CORS (rejected) — server fns proxy FastAPI server-side, preserving SSR and the one-line swap law.
- **Decision**: Document the full backend in `context/backend/` (README + data-model + api-reference + anomaly-engine + seed-generator) on branch `009-backend-foundation` before any code. Stack: FastAPI async + Pydantic v2 + SQLAlchemy 2.0 async/asyncpg + Alembic + JWT (httpOnly cookie + bearer) + pytest + uv + Docker Compose (Postgres 16). Five rule-based detectors (cost outlier, delay/stall, near-duplicate, expenditure pattern, utilisation/UC) compute+store at ingest with peer stats and audit trail (`detector_inputs` JSONB, `detector_version`). AI: NO ML, NO LLM in v1 — the copilot tools (searchWorks/getWork/comparePeers/explainFlag/listEvidence) are plain REST endpoints so an LLM can slot behind them later.
- **Why**: Documentation-first turns the "AI won't hallucinate" requirement into testable artifacts — pinned JSON examples, exact detector formulas with severity bands, a verified mulberry32 port (test vectors proven identical to the TS original to 10 decimals), and a parity test that fails if Python seed ≠ frontend mock. The mock-behind-contract law (ADR-006/007) survives: server fns keep their signatures, only bodies change.
- **Consequences**: `context/backend/` is now the backend source of truth — implementation must match it or amend it via ADR. Anomaly ids are not stable across recompute (frontend never persists them — verified). KPI endpoint serves scheme-snapshot constants until real ingest. The `/ai/chat` endpoint is explicitly deferred; copilot tool endpoints are its stable substrate. Python parities verified headless on 2026-09-14 (Node + Python 3.13).
- **Affects**: context/backend/**, branch 009-backend-foundation, future backend/ package, future src/server/mplads/* bodies (not yet), decision.md/flow.md/progress-tracker.md

### ADR-024: Rebrand display to NIRIKSHAN-AI (display-only, copilot→NIRIKSHAN)
- **Date**: 2026-09-09
- **Status**: Accepted
- **Context**: Home/sidebar still showed template "Admin Dashboard"; jury demo needs proper NIRIKSHAN-AI naming. User chose exact spelling NIRIKSHAN-AI, display-only scope, and Sentinel→NIRIKSHAN rename.
- **Options considered**: Full rebrand incl. package.json name change (rejected — build/tooling churn, user chose display-only); keep Sentinel sub-brand (rejected — user explicitly chose NIRIKSHAN Copilot for consistency).
- **Decision**: Update `APP_CONFIG` (name/copyright/title/description) + `manifest.json` (short_name/name/description); auth v2 panel → NIRIKSHAN-AI; chat header/data → NIRIKSHAN Copilot; page-assistant fallback/title/chips + dossier strings + mock actor → NIRIKSHAN. Leave `package.json` name as `admin-dashboard`. Sidebar needs no edit (reads APP_CONFIG.name).
- **Why**: Smallest diff that makes every jury-visible surface say NIRIKSHAN-AI while keeping installs/builds stable; single source (APP_CONFIG) prevents future drift.
- **Consequences**: Any new UI copy must use NIRIKSHAN-AI / NIRIKSHAN Copilot, never Sentinel or Admin Dashboard. Package rename remains open if ever needed.
- **Affects**: app-config, manifest, auth v2 panel, chat, page-assistant, dossier, mock

### ADR-023: Prototype auth shell — v2 default, cookie session, notifications + settings
- **Date**: 2026-09-08
- **Status**: Accepted
- **Context**: Login/register were non-operational (no session, no guard, register dumped JSON, Google button dead); no notifications or settings pages; user ordered v2 as default + real auth behavior on a verify-first branch.
- **Options considered**: Full credential backend now (rejected — no Python backend exists yet; blocks the demo); keep v1 screens (rejected — user explicitly chose v2); new shared auth abstraction layer (rejected — OC principle: extend via new store + shims, mirror the existing role-store cookie pattern).
- **Decision**: `stores/session/` (opaque token + officer email cookies, 7d, sameSite lax via existing server fns — no server-actions change); dashboard `beforeLoad` guard with `?redirect=` return; v1 routes become redirect shims; login/register forms create the session; Google button gets an honest unavailable toast; new `/dashboard/notifications` (derived from flags/stalls/UC/overdue, read-state + prefs in localStorage) and `/dashboard/settings` (officer card, prefs switches, sign-out, prototype note); sidebar + account menu + page-assistant extended; v2 side-panel copy rebranded to MPLADS.
- **Why**: Smallest change that makes auth actually operate end-to-end (sign in → guard → sign out) while staying honest that it is a demo cookie the Python backend will replace with signed sessions.
- **Consequences**: Session is not real security (any valid-shaped credentials work; cookies not httpOnly) — must be replaced backend-side, never hardened client-side. Branch `20260908-auth-shell` awaits user verification before merge.
- **Affects**: auth routes, session store, dashboard shell, sidebar-items, account-switcher, page-assistant, notifications/settings pages

### ADR-020: Agentation reinstalled — duplicate React fixed via dedupe
- **Date**: 2026-09-07
- **Status**: Accepted
- **Context**: User wants the Agentation feedback overlay back for UI suggestions; the ADR-018 crash was two React copies (app + pre-bundled dep), not a broken package.
- **Options considered**: Error boundary around the toolbar (rejected — treats symptom, tree stays double-React); `resolve.dedupe: ["react", "react-dom", "react/jsx-runtime"]` forcing one copy (chosen).
- **Decision**: Reinstalled `agentation@3.0.2` (`--save-dev`), rewired dev-gated `<Agentation />` in the root shell, added dedupe to `vite.config.ts`.
- **Why**: Standard Vite fix for hook-call crashes from pre-bundled deps; keeps the UI-feedback workflow the user asked for.
- **Consequences**: If the crash recurs in dev, the fallback is lazy-mounting the toolbar behind an error boundary — report the console log.
- **Affects**: package.json, vite.config.ts, routes/__root.tsx

### ADR-018: Remove agentation; template chat becomes the Copilot page
- **Date**: 2026-09-07
- **Status**: Accepted
- **Context**: `agentation@3.0.2` crashed every dev page (`Invalid hook call` — ships its own React copy conflicting with the app's React 19; PolyForm-Shield license also non-open). Same session: user asked for a real AI chat page on the sidebar using existing code, not scripted chips.
- **Options considered**: Vite `resolve.dedupe` alias to force one React (rejected — fights the package's bundling, fragile, keeps a Shield-licensed dep); remove agentation, adopt `(main)/chat` as Sentinel Copilot (chosen).
- **Decision**: Uninstalled agentation, reverted `__root.tsx`; chat threads rebuilt from mock (1 copilot + 12 flagged-work threads), composer wired to a data-grounded `copilot-brain.ts` tool layer (explain/compare/list/stalls/UC/tender intents over live mock data, honest fallback); header search + list tabs + sidebar nav all functional; dead template controls removed; sidebar gains AI Copilot → `/chat`.
- **Why**: Crash was a broken dependency, not our code; the copilot answers compute from real data instead of canned strings, and every control on the page now works.
- **Consequences**: No visual-feedback overlay until a React-19-safe alternative is found; copilot brain is deterministic tool calls — LLM provider decision stays open for SPEC 05.
- **Affects**: routes/(main)/chat/**, sidebar-items.ts

### ADR-017: Dev-only Agentation overlay for visual agent feedback
- **Date**: 2026-09-07
- **Status**: Accepted
- **Context**: User requested the `agentation` package (visual feedback for AI coding agents) mounted at app root, dev only.
- **Options considered**: Mount inside dashboard shell (rejected — should cover auth pages too); root shell next to Toaster with NODE_ENV gate (chosen).
- **Decision**: `npm install agentation --save-dev` (v3.0.2, 0 vulnerabilities); `<Agentation />` in `__root.tsx` gated on `process.env.NODE_ENV === "development"`. Production bundle unaffected (dead-code eliminated).
- **Why**: Whole-app coverage including login; zero prod impact.
- **Consequences**: New devDependency to keep updated; if the overlay ever breaks SSR dev, wrap in client-only boundary.
- **Affects**: package.json, routes/__root.tsx

### ADR-016: Parallel worktree lanes merged conflict-free, build per merge
- **Date**: 2026-09-07
- **Status**: Accepted
- **Context**: User rejected N-branches-from-commit Sit-and-merge-later in favor of parallel development with isolated verification, then chose single-branch sequential — then ordered "commit current, implement all in parallel."
- **Options considered**: 4 branches merged at the end with one big build (rejected — errors unattributable); single branch with parallel agents on disjoint files (rejected — shared working tree clobbers); worktrees, one per lane, each with junctioned node_modules (chosen).
- **Decision**: `006-officer-workspace` + 4 worktrees (lane/contract-dossier, lane/fund-perf, lane/adopt-pages, lane/nav-ai) with disjoint file ownership; each lane verified tsc/biome/build in isolation; committed per lane; merged --no-ff in A→B→C→D order with a `vite build` after every merge.
- **Why**: Isolation makes every failure attributable to one lane; disjoint ownership made all 4 merges conflict-free; per-merge builds prove the integration never broke.
- **Consequences**: Worktrees removed after merge; lane branches kept for record. india-states.json now vendored twice (overview + dossier) — accepted duplication under the no-cross-screen-import law.
- **Affects**: git workflow, 006-officer-workspace

### ADR-015: Single MPLADS sidebar group + floating page assistant
- **Date**: 2026-09-07
- **Status**: Accepted
- **Context**: Created pages were not discoverable (template nav); user wants an Ask-AI toggle on every page answering about current context.
- **Options considered**: Keep template nav + add links (rejected — officer goals buried); separate /ai page only (rejected — user explicitly wants omnipresent toggle); floating toggle mounted once in dashboard shell with per-route scripted context (chosen).
- **Decision**: One MPLADS group (Overview/Works/Fund Flow/Performance/Verifications/Deadlines/Documents/UC Tracking); `<PageAssistant/>` (generalized copy of dossier contextual-ai, local work lookup duplicated, no cross-imports) mounted in dashboard route with route-id → context mapping; Sheet on all sizes via floating button.
- **Why**: Discoverability in one glance; toggle follows the officer instead of demanding a page visit; scripted answers stay honest until SPEC 05's real brain.
- **Consequences**: Dossier shows both inline assistant (anomalies+ tabs) and shell toggle — revisit overlap in SPEC 05.
- **Affects**: sidebar-items.ts, dashboard shell, page-assistant

### ADR-014: Adopt template pages in place — rename, don't recreate
- **Date**: 2026-09-07
- **Status**: Accepted
- **Context**: finance/analytics/tasks/calendar/file-manager/invoice already exist in premium form; user wants many officer pages without rebuilds.
- **Options considered**: New MPLADS routes copying donors (rejected — duplicates code for identical layouts); editing shared primitives (rejected — repo law); in-place relabel + rebind to mock aggregates (chosen).
- **Decision**: Each page keeps layout/components; only labels/data change; every control works or is removed (CSV exports, working filters, wired upload prepends); dead template buttons (Settings, currency select, Add event, Download PDF, Import data) removed.
- **Why**: Premium layouts stay pixel-faithful; "ugly custom KPI" failure mode eliminated by construction.
- **Consequences**: Template demo content gone from those pages (kept in git history); any future template sync must be manual.
- **Affects**: 6 template screens

### ADR-013: Work contract gains tender/execution/money fields on a separate rng stream
- **Date**: 2026-09-07
- **Status**: Accepted
- **Context**: Dossier must show tender holder/awarder, department, labour, demanded time, returned money — none existed in SPEC-00 contract.
- **Options considered**: Derive from existing fields (rejected — agency≠tender holder semantically, labour would be invented text); extend schema + reseed (chosen) with a separate mulberry32(MPLADS_SEED+500) stream so all existing demo values stay byte-identical.
- **Decision**: workSchema += tenderHolder/tenderAwardedBy/department/labourDeployed/demandedDays/returnedLakh; returnedLakh capped at sanctioned−expenditure headroom so spent+returned+balance ≡ sanctioned; W-1014 pinned (Contractor-07, District Authority Bhopal, PWD, 42, 330, 0).
- **Why**: Real demo fields with zero drift in previously approved numbers; donut math always sums to 100%.
- **Consequences**: Shape change = future server fns must return the new fields; seed-bundle key unchanged since values are additive.
- **Affects**: mplads-schema.ts, mplads-mock.ts

### ADR-012: SPEC 03 works table — URL-owned filters, interim anchors, honest states
- **Date**: 2026-09-07
- **Status**: Accepted
- **Context**: SPEC 03 demands shareable `?lens=&state=&q=` plus header selects, toolbar checks, search, sort, pagination — without prop-drilling the table instance up to the route.
- **Options considered**: All filters in table state (rejected — URL wouldn't restore); lifting `useTable` into the route (rejected — breaks the tasks donor structure); typed `Link` to dossier (rejected — SPEC 04 route doesn't exist, tsc fails); fake skeleton shimmer on sync data (rejected — decoration).
- **Decision**: `?lens=&state=&district=&type=&q=` owned by the URL (extends acceptance superset), synced into column filters via effect + page reset; severity/kind multi-checks stay table-local; header Reset clears URL + bumps a reset key that clears local checks; dossier links are plain anchors until SPEC 04; Updated sub-line shows relative "Xd ago" (date-only data has no times for `h:mm a`).
- **Why**: Single source of truth per filter, every combination shareable/restorable, donor file shapes preserved, zero dead controls.
- **Consequences**: Typing in search navigates (replace, no reload, focus kept); severity/kind selections don't survive reload (documented, out of acceptance scope).
- **Affects**: `dashboard/works/` (data/columns/works-toolbar/table/route)

### ADR-011: Blank map was a wrong-winding fit bbox; now on react19-simple-maps
- **Date**: 2026-09-07
- **Status**: Accepted
- **Context**: Risk map rendered empty across three implementations. Headless d3 probing pinned it: my hand-made India bbox ring was wound opposite to d3-geo's expectation, so `fitExtent` measured the world-minus-India complement and set scale ≈60 instead of ≈680 — the whole country rendered ~30px wide (invisible speck). Data, fetch/import, and fills were all innocent.
- **Options considered**: `react-simple-maps@3` (rejected — React 18-only peer vs repo React 19, no `--force`); hand-rolled d3 with corrected fit (rejected — user asked for a real map library, and manual projection math already burned us once); `@vnedyalk0v/react19-simple-maps@2.0.10` (chosen — React-19-native simple-maps fork, 21k weekly downloads, GeoJSON-object input so no fetch layer, ZoomableGroup for the requested pan/zoom, Sphere for ocean).
- **Decision**: `IndiaRiskMap` rebuilt on the fork (`ComposableMap` geoMercator scale 680.42 center [82.06, 21.85] — numbers extracted from a verified d3 fit, not guessed); fills via inline `var()`/`color-mix` (dark-mode correct, zero Tailwind-generation dependence); hover via cursor-anchored HTML readout; states without demo data get native `<title>`.
- **Why**: Library owns projection/path/event wiring (the exact layers that failed silently); verified numbers, not hoped-for ones; pan/zoom included per request.
- **Consequences**: One new dependency (0 vulnerabilities at install); `d3-geo`/`topojson-client` stay for the logistics donor; if the map is STILL blank after this, the cause is environmental (stale branch/server/cache), not code — verify via KPI badge style (outline = new code running).
- **Affects**: `dashboard/overview/-components/india-risk-map.tsx`, `package.json`

### ADR-010: SPEC 02 polish — ministry-first default, outline badges, visible map errors
- **Date**: 2026-09-07
- **Status**: Accepted
- **Context**: Live review reported three symptoms: KPI strip looked "AI solid", queue showed only 3 rows with no pagination, map fully blank. Audit (redesign-existing-projects skill) vs CRM/finance donors found: solid-fill badges (metric-cards ships 2 solid + 3 solid-destructive; CRM uses outline tone washes); district-first default scoped the queue to 5 Bhopal works → 3 flagged rows; map failure rendered an endless `Skeleton` with the error only in the console.
- **Options considered**: Pagination on the 8-row card (rejected — decoration on a fixed list; the full filterable table is SPEC 03); rebuilding cards from scratch (rejected — donor anatomy stays, only badge language changed); keeping district-first per SPEC-01 text (rejected — the command centre's first paint must be the full demo, scoping is one click away).
- **Decision**: Default role `ministry` (store + `parseRole` fallback + label fallback); KPI badges to `outline` + green/destructive washes (CRM idiom, same layout/captions); map gets a visible "Map unavailable + Retry" state (retry counter, `useExhaustiveDependencies` suppression documented inline).
- **Why**: First paint now shows the judged story (8 rows, W-1014 first, 6-state map); badges match the repo's most premium strip; a blank map is now a diagnosable state instead of a mystery.
- **Consequences**: Overrides SPEC-01 "district first" acceptance — spec text kept for history, behavior is ministry-first; role switch still demonstrates scoping (verified headless: 8/4/3 rows).
- **Affects**: `src/stores/role/role-store.ts`, overview `kpi-strip`/`india-risk-map`/`priority-queue`

### ADR-009: SPEC 02 overview — vendored GeoJSON, plain-Table queue, SVG-anchor selection
- **Date**: 2026-09-07
- **Status**: Accepted
- **Context**: SPEC 02 needs India state geometry (not in repo) plus a queue that is deliberately dumber than the tasks table (8 fixed rows, no sort/filter/pagination).
- **Options considered**: 11MB full-res states GeoJSON (rejected — demo weight); hand-rolled TopoJSON conversion (rejected — no offline tooling); full TanStack table for 8 static rows (rejected — machinery with every feature explicitly out of scope); `role="button"` on SVG paths (rejected — trips `useSemanticElements` with no valid suppression point).
- **Decision**: Vendored click_that_hood 35-state GeoJSON (2015 vintage: undivided J&K, has Telangana; covers all 6 seed states), stripped to `{name}` + 2-decimal coords + dupe removal (3.2MB→501KB) at `public/geo/india-states.json` — GeoJSON rendered natively by d3 (no TopoJSON step, no new deps). Queue = plain `Table` with tasks row classes. Map states = SVG `<a href="?state=">` (progressive enhancement + free keyboard/focus) with SPA `preventDefault` navigate; no-data states get native `<title>`.
- **Why**: Smallest honest build: component clones donor mechanics, data file is cached once, queue matches its actual requirements, selection is semantic HTML instead of ARIA workarounds.
- **Consequences**: Map vintage predates Ladakh split — fine for demo choropleth, revisit with official LGD/SOI source before production; dossier/works anchors are plain `<a>` until SPEC 03/04 own the routes (typed `Link` would fail tsc today).
- **Affects**: `dashboard/overview/`, `public/geo/india-states.json`, role label (Bhopal)

### ADR-008: SPEC 01 entry + role lens — shell mapping, stub, kept validation
- **Date**: 2026-09-07
- **Status**: Accepted
- **Context**: SPEC 01 text says `/overview`, but the dashboard shell (sidebar/header/role switcher) only renders under `/dashboard/*`; a top-level `/overview` would hide the role lens the queue needs.
- **Options considered**: Literal top-level `/overview` route outside the shell (rejected — no header/role switcher where judges need it); keep `/dashboard` → default until SPEC 02 (rejected — breaks SPEC-01 acceptance); overview under the shell + coming-soon stub now, real queue in SPEC 02 (chosen).
- **Decision**: `dashboard/overview/route.tsx` (URL `/dashboard/overview`, stub cloned from `coming-soon/route.tsx`); `/` + `/dashboard` redirect there; login keeps email/min-6 Zod validation (demo hint supplies passing credentials) and navigates there with a prototype toast; role = standalone zustand `create` store (chat/mail precedent, not the heavier preferences provider) on existing `getValueFromCookie`/`setValueToCookie`, validated by SPEC-00 `officerRoleSchema`, hydrated once from the dashboard loader.
- **Why**: Every branch stays demo-able with zero console errors; no working behavior destroyed (validation, error states); smallest store that fits a cross-route lens; zero new server fns, zero new deps.
- **Consequences**: SPEC 02 replaces the stub body (route file stays); if literal top-level paths are ever wanted, it's a route-file move, not a rewrite.
- **Affects**: dashboard routes/header, `src/stores/role/`, entry redirects

### ADR-007: SPEC 00 mock-data contract — seeded RNG, fixed demo date, derived rollup
- **Date**: 2026-09-07
- **Status**: Accepted
- **Context**: SPEC 00 needs one shared dummy-data contract (40 works, 12 flags, flagship W-1014) that renders identically on every reload and that future server fns + ML can return behind the same shapes.
- **Options considered**: `Math.random` + live `new Date()` (rejected — demo drifts between reloads/judges); hand-written static JSON (rejected — 40 works × relations by hand is error-prone and hard to reseed); seeded builder (chosen).
- **Decision**: `mulberry32` seeded `26102` + fixed `DEMO_TODAY 2026-09-07` (all dates derived via date-fns, never `Date.now`); geo rollup computed from works (not hand-written); money via existing `formatCurrency` idiom (`formatINR`) plus a `formatLakh` shorthand for the `₹58.9L` comparison template; delay/duplicate anomalies use the schema's nullable median/actual fields; verification via throwaway ts-node/native-hook script (deleted after, byte-identical across runs).
- **Why**: Deterministic seed = every reload renders the identical demo the judges approved; derived rollup can't drift from the works table; reusing `formatCurrency`/date-fns keeps the ponytail ladder (existing repo code first, minimal new code).
- **Consequences**: Routes must import shapes only from `mplads-schema.ts`; shape change = bump `mplads-demo-v1` and reseed; localStorage persistence + `-components/data.ts` slices belong to SPEC 01–05, not here.
- **Affects**: `admin-dashboard/src/lib/mplads-schema.ts`, `admin-dashboard/src/lib/mplads-mock.ts`

<!-- Newest decisions go at the top of this section. Keep this section growing — it is
     the living memory of the project. Delete the two example entries below once you
     have real decisions. -->

### ADR-006: SIH MVP scope + template-reuse strategy + UI-first prototype
- **Date**: 2026-09-06
- **Status**: Accepted
- **Context**: SIH26102 (MoSPI) needs an AI anomaly-detection workspace for MPLADS works. We own a 20+-screen TanStack Start + shadcn template. Design study (`chat.md`) concluded: 5 routes max, officer-loop-driven, explain every alert.
- **Options considered**: Build MVP screens from scratch (rejected — template donors cover tables/charts/chat/files; custom work would look worse and take longer); adopt template nav as-is (rejected — CRM/Finance/etc. pages aren't the officer's workflow); backend-first (rejected — judge demo needs working UI now).
- **Decision**: 5 routes (`/login`, `/overview`, `/works`, `/works/:workId`, `/ai`); clone closest donor screens and adapt; charts via `ui/chart.tsx`+recharts, India map via `shipment-route-map.tsx` pattern + added TopoJSON; prototype on bundled mock data typed by shared Zod shapes so server fns slot in later.
- **Why**: Components are professional and proven; structure is wrong for the domain. Mock-behind-contract keeps the demo real today and the backend swap trivial tomorrow.
- **Consequences**: Must add India TopoJSON + choose DB + anomaly-engine home + AI provider (open questions). Template pages outside the loop stay unbuilt.
- **Affects**: `admin-dashboard/`, all context files

### ADR-005: Skip Impeccable — npm blocked it as compromised, do not force
- **Date**: 2026-09-06
- **Status**: Accepted
- **Context**: `Skills.py` failed on `npx impeccable install` with `npm error code ECOMPROMISED` (npm's compromised-package block).
- **Options considered**: Retry with `--force` (rejected — Agent.md explicitly forbids `--force` installs and bypassing a compromise block is a security violation); skip Impeccable, keep the 34 skills that installed cleanly (chosen).
- **Decision**: Leave Impeccable uninstalled. Revisit only if the package is unflagged upstream.
- **Why**: Security over completeness — 34 of 35 skill targets landed; one blocked package isn't worth overriding npm's integrity protection.
- **Consequences**: No Impeccable design engine available; GSAP/Hallmark/Taste/Emil skills cover design needs.
- **Affects**: repo root tooling

### ADR-004: Dashboard setup — neutral naming and placeholder demo data
- **Date**: 2026-09-06
- **Status**: Accepted
- **Context**: Needed a clean starting point for the dashboard with neutral project naming and realistic placeholder demo data.
- **Options considered**: Keep unused docs at the template root (rejected — dead weight); leave external links in shared components (rejected — they'd point outside the project); keep real-looking personal demo identities (rejected — placeholders are safer for a shared prototype).
- **Decision**: Set up `admin-dashboard/` with package/display naming (`Admin Dashboard`); pruned unused docs (`README.md`, `CONTRIBUTING.md`, `LICENSE`, `media/`); neutralized `support-card` and `github-repositories-menu` (placeholder links); standardized demo data on placeholder identities (`Alex Carter`/`Jordan Lee`/`Example Corp`/`example.com`).
- **Why**: Placeholders keep demo screens realistic without implying real people or external dependencies. Logic, routes, and structure untouched.
- **Consequences**: No license file ships with the template — add one before distributing. Header menu links are placeholders (`#`) until real links are wired.
- **Affects**: `admin-dashboard/` docs, config, demo data; `context/progress-tracker.md`

### ADR-003: Remove Scaffold.py — canonical trees are the source of truth
- **Date**: 2026-08-11
- **Status**: Accepted
- **Context**: Scaffold.py generated a folder skeleton, but `npm install` / create-app already provides boilerplate. The generator produced a generic tree that ignored per-project needs and duplicated what the `folder-structure` skill already defines.
- **Options considered**: Keep Scaffold.py but improve it (extra maintenance, still redundant with the skill); remove it and rely on the canonical trees (chosen).
- **Decision**: Delete Scaffold.py. The `folder-structure` skill (`.agents/folder-structure/SKILL.md`) is the single source of truth; agents materialize its canonical trees by hand, creating only folders the product needs.
- **Why**: One source of truth instead of two. The skill's trees are the "senior engineer" hierarchy — feature-first frontend, controller-service-repository backend. Remove the Python dependency from the workflow.
- **Consequences**: Agents must create folders manually — the skill's Step 2 shows how. All docs updated (Agent.md, SKILLS.md, README.md, .agents/AGENTS.md).
- **Affects**: repo root, `.agents/folder-structure/SKILL.md`, all docs referencing it

### ADR-002: Add `flow.md` + `decision.md` as living context files
- **Date**: 2026-08-11
- **Status**: Accepted
- **Context**: Agents couldn't understand the project instantly and didn't update context properly. `progress-tracker.md` alone didn't capture HOW the app works (function call maps, user flows) or WHY decisions were made.
- **Options considered**: Fold this info into existing files (overloaded, no single "how/why" home); new dedicated files (chosen).
- **Decision**: Create `context/flow.md` (Mermaid call maps, user flows, request/response, routes) and `context/decision.md` (append-only ADR log). Both are updated on EVERY task, alongside `progress-tracker.md`.
- **Why**: Reading the three files (progress-tracker + flow + decision) gives state, structure, and rationale instantly. Decision log prevents re-deciding and preserves reasoning.
- **Consequences**: Agents must keep diagrams in sync; stale diagrams are treated as bugs. Sync protocol is enforced via AGENTS.md + Agent.md.
- **Affects**: `context/`, `AGENTS.md`, `Agent.md`, `SKILLS.md`, `.agents/AGENTS.md`, `ai-workflow-rules.md`

### ADR-001: Choose Next.js 16 + TypeScript
- **Date**: YYYY-MM-DD
- **Status**: Accepted
- **Context**: Need an SSR-capable framework with strong typing for a multi-page product.
- **Options considered**: React + Vite (no SSR, worse SEO), Astro (less dynamic for app routes), SvelteKit (smaller ecosystem for the team).
- **Decision**: Next.js 16 + TypeScript.
- **Why**: SSR/SSG out of the box, App Router supports the feature-first layout, TypeScript strict mode is a hard requirement, largest ecosystem.
- **Consequences**: Must default to server components; avoid heavy client bundles.
- **Affects**: entire app

### ADR-002: [Example — component library choice]
- **Date**: YYYY-MM-DD
- **Status**: Accepted
- **Context**: Need form controls and modals for the [feature] section.
- **Options considered**: HeroUI (too heavy to default), MUI (banned), custom (slow).
- **Decision**: Pull the [X] components from Astryx, animate with [Y].
- **Why**: Matches the design language in `ui-context.md`; copy-paste ownership preferred per `DESIGN.md`.
- **Consequences**: [things to watch out for]
- **Affects**: `features/<feature>/components/`
