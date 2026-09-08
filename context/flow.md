# Flow — MPLADS Sentinel (SIH26102)

> HOW the app works. Update when functions, components, routes, APIs, or flows change. Stale diagrams are bugs.

## Overview

An officer opens **Overview**, sees what needs attention, drills into the **Works** queue, opens a **Work dossier** (financials, progress, explained anomalies, evidence), asks the **AI copilot**, and records a **decision** (Verified / Dismissed / Action Required). Prototype runs on bundled mock data shaped like future server responses; backend/ML slots in behind identical signatures.

## Architecture diagram

```mermaid
graph TD
    subgraph Client [TanStack Start SSR]
        Shell[dashboard/route.tsx<br/>sidebar + header + Outlet]
        O[/overview/]
        W[/works/]
        D[/works/:workId dossier/]
        AI[/ai copilot/]
        Shell --> O & W & D & AI
    end
    subgraph Server [createServerFn in src/server/]
        API[mplads fns:<br/>works / anomalies / evidence / decisions / ai.chat]
    end
    subgraph Data
        Mock[-components/data.ts<br/>prototype]
        DB[(DB TBD<br/>+ anomaly engine)]
    end
    O & W & D & AI --> API
    API --> Mock
    Mock -.->|same shapes| DB
```

## User flows

### Flow: Morning triage
**Goal**: know what needs attention today. **Steps**: Overview KPIs + risk map → high-priority queue → click top case → dossier.

```mermaid
flowchart LR
    A([Officer opens /overview]) --> B[Scans KPIs + risk map]
    B --> C[Opens priority queue]
    C --> D[Clicks case → /works/:workId]
```

### Flow: Investigation → decision
**Goal**: verify a flag and record the outcome. **Steps**: dossier tabs (financials/progress/anomalies/evidence) → AI question → set status + note → activity log entry.

```mermaid
flowchart LR
    A([Dossier]) --> B[Reads explained anomaly]
    B --> C[Checks evidence]
    C --> D[Asks AI copilot]
    D --> E{Decision}
    E --> F[Verified / Dismissed / Action Required]
    F --> G[Activity log]
```

### Flow: Evidence upload
**Goal**: attach supporting records to a work. **Steps**: dossier Evidence tab → upload (validated form) → file appears in grid/list → linked to anomaly context.

## Request / response flows

### Prototype (current): dossier load
```mermaid
sequenceDiagram
    participant U as Officer
    participant R as works/:workId route
    participant C as -components (data.ts mock)
    U->>R: opens work
    R->>C: import mock Work + Anomaly[] + Evidence[]
    C-->>R: typed data (Zod shapes)
    R-->>U: rendered dossier
```

### Target (backend built): anomaly-flagged works
```mermaid
sequenceDiagram
    participant U as Officer
    participant R as Route loader
    participant S as createServerFn anomalies.list
    participant E as Anomaly engine
    participant D as Database
    U->>R: opens /works?filter=high-risk
    R->>S: validated query (Zod)
    S->>E: score works vs peer groups
    E->>D: read sanctions/expenditure/progress
    D-->>E: rows
    E-->>S: flags + peer stats + reasons
    S-->>R: Anomaly[]
    R-->>U: queue with explanations
```

## Function call map

### Dossier (BUILT + extended on 006)
```
/works/:workId (route.tsx, composes)
  ├─ <WorkSummary/>            (header: IDs, status badge, amounts)
  ├─ <FinancialsCard/>         (finance/ donor: KPI cards + recharts line)
  ├─ <ProgressCard/>           (meters + timeline)
  ├─ <AnomalyExplainer/>       (NEW: peer N, median vs actual, corroborating signal)
  ├─ <EvidenceGrid/>           (file-manager/ donor: grid/list + upload dialog)
  ├─ <ActivityTimeline/>       (invoice-style list)
  ├─ <DecisionBar/>            (Verified/Dismissed/Action Required + notes form)
  └─ <ContextualAI/>           (chat/ donor: bubble thread + tool cards)
```
Extended: KPI strip (sanctioned/spent/progress/stall/flags/labour) + map/tender command row above tabs; tender & execution block (holder/awarder/dept/labour/demanded-vs-elapsed), `WorkLocationMap` (single-pin copy of india-risk-map), spent/balance/returned strip, duplicate overlap verdict, enriched flags (peer table, evidence count, UC status). Inline dossier assistant removed — Ask-AI buttons dispatch `mplads:ask-ai` to the floating page-assistant popover. Global `<PageAssistant/>` floating toggle mounted in dashboard shell (page-context scripted answers).

### Overview (to build)
```
/overview (route.tsx, composes)
  ├─ <KpiStrip/>               (default/ donor: metric-cards)
  ├─ <IndiaRiskMap/>           (logistics/shipment-route-map donor + India TopoJSON TO ADD)
  └─ <PriorityQueue/>          (tasks/crm table donor: columns/schema/table, top-N)
```

### Works (to build)
```
/works (route.tsx, composes)
  └─ <WorksTable/>             (crm opportunities-table donor + tasks toolbar/filters)
       └─ row click → /works/:workId
```

## Route map

| Route | Source | Purpose |
|-------|--------|---------|
| `/auth/v1|v2/login|register` | **v2 is default; v1 routes are redirect shims to v2** (ADR-023) | Officer sign-in (valid-shaped credentials → demo cookie session → `/dashboard/overview` or `?redirect=`) |
| `/` and `/dashboard` | redirect (SPEC 01) | Entry → `/dashboard/overview`, zero clicks |
| `/dashboard/default` etc. | template (donor only) | Reference screens — NOT in MVP nav |
| `/overview` | **to build** | KPIs + map + priority queue |
| `/dashboard/overview` | stub (SPEC 01) → SPEC 02 builds the queue here | Entry landing inside the dashboard shell |
| `/dashboard/overview` | **BUILT (SPEC 02)**: `KpiStrip` + `IndiaRiskMap` + `PriorityQueue` (?state= two-way filter, role scoping) | Morning triage |
| `/works` | **BUILT (SPEC 03)** at `/dashboard/works`: full ledger (URL `?lens=&state=&district=&type=&q=`, 10-col table, pagination) | Search/filter/sort works |
| `/works/:workId` | **BUILT (SPEC 04 + 006 extension)** at `/dashboard/works/$workId`: 6 tabs (overview/financials/progress/anomalies/evidence/activity), tender block, map pin, money strip, duplicate verdict, sticky decision bar, contextual AI | Dossier |
| Adopted (006, in-place relabel on mock data) | `finance` → fund flow · `analytics` → performance · `tasks` → verification queue · `calendar` → deadlines (56 derived events) · `file-manager` → documents library · `invoice` → UC tracking | Officer workflow pages |
| Sidebar nav | single MPLADS group: Overview/Works/Fund Flow/Performance/Verifications/Deadlines/Documents/UC Tracking (006) + AI Copilot + Notifications + Settings (ADR-023) | Discoverability |
| `/ai` | **to build** on `(main)/chat/` | Global copilot |
| Sidebar nav | `navigation/sidebar/sidebar-items.ts` | Replace groups with MVP nav (Overview/Works/AI + dossier via click) |

## API endpoints (server functions)

| Function | Input (Zod) | Output | Today |
|----------|-------------|--------|-------|
| `works.list` | filters/search/sort/page | Work[] + total | mock `data.ts` |
| `works.get` | workId | Work detail | mock |
| `anomalies.list` | workId \| filters | Anomaly[] (+peer stats) | precomputed mock flags |
| `evidence.list/upload` | workId / file+meta | Evidence[] | local records |
| `decisions.record` | workId, status, note | Activity entry | in-memory |
| `session.signIn/signOut` | email (Zod-validated form) | `mplads_session` + `mplads_officer` cookies (7d) | cookie store, prototype |
| `notifications.list` | prefs filter | derived attention items (flags/stalls/UC/overdue) | mock-derived, read-state local |
| `ai.chat` | message + page context | answer + tool calls | to design (tool layer: getWork, comparePeers, explainFlag, searchWorks) |

## State flow

1. Route loaders/server fns return Zod-typed data (mock today, DB later — same shapes).
2. Session: dashboard `beforeLoad` requires `mplads_session` cookie, else redirect to `/auth/v2/login?redirect=`; auth routes bounce signed-in officers to overview; `useSessionStore` hydrates email from the dashboard loader (prototype cookie, not real security).
2. Role lens: header `RoleSwitcher` → `useRoleStore` (`src/stores/role/`) + `mplads_role` cookie (7d); dashboard loader hydrates the store; queue/map read role as a scope preset (Ministry = all 40, the first-paint default; State = MP; District = Bhopal).
2. Dossier/AI conversation state: local component state first; promote to zustand store only when cross-route need is proven.
3. Preferences (theme/layout) persist via existing cookie-backed server fns — untouched.

## Update protocol (MANDATORY)

Update this file when any of the following change:

- [ ] New, renamed, or removed function / component / hook / route
- [ ] Call chain between functions changed
- [ ] New user flow or a change to an existing flow
- [ ] New or removed API endpoint
- [ ] New dependency in a call chain (library, service)
- [ ] State management approach changed
