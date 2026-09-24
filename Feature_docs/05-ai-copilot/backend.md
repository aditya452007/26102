# SPEC 05b — Copilot Backend (`/api/v1/copilot`)

> Backend for SPEC 05's scripted copilot brain. The four tool functions `copilot-brain.ts`
> calls in-process become real REST endpoints; the frontend's scripted brain (intent rules →
> tool call → template sentence) keeps working unchanged, and because every tool is a plain
> endpoint, an LLM can replace the intent layer later **without contract changes** (the
> literal ADR-025 goal). No LLM, no ML here — these are deterministic query endpoints.

## Tools → endpoints

| Scripted tool (`copilot-brain.ts`) | Endpoint | Returns |
|---|---|---|
| `searchWorks` | `GET /api/v1/copilot/search` | `ToolSearchOut` |
| `getWork` | `GET /api/v1/copilot/works/{work_id}` | `ToolWorkOut` |
| `comparePeers` | `GET /api/v1/copilot/compare` | `ToolCompareOut` |
| `explainFlag` | `GET /api/v1/copilot/explain/{anomaly_id}` | `ToolExplainOut` |
| `listEvidence` | `GET /api/v1/works/{id}/evidence` | dossier bundle's evidence (SPEC 04b) — no separate tool route |

Design rule: **tool endpoints are read-only projections of the same services SPEC 02b–04b
use** — they never contain their own queries. The repo functions are shared (explicitly
exported per `structure.md`), so the copilot's answer and the screens' data can never
diverge.

## `GET /api/v1/copilot/search?q=&state=&type=&limit=`

```jsonc
// 200 — ToolSearchOut  ·  scoped by JWT (ministry shown)
{ "query": "community hall", "total": 3, "results": [
  { "id": "W-1014", "title": "Community Hall Construction",
    "district": "Bhopal", "state": "Madhya Pradesh",
    "sanctionedRs": 19000000, "severity": "high", "status": "stalled" } ] }
```

Same search semantics as SPEC 03b (`id/title/agency` substring, case-insensitive); `limit`
default 5, max 20. Scoped exactly like every read (a district officer's tool answers only
contain their district — the copilot cannot leak out-of-scope rows).

## `GET /api/v1/copilot/works/{work_id}`

```jsonc
// 200 — ToolWorkOut (compact work card + current decision, for "tell me about W-1014")
{ "id": "W-1014", "title": "Community Hall Construction", "type": "community-hall",
  "agency": "PWD Bhopal", "district": "Bhopal", "state": "Madhya Pradesh",
  "status": "stalled", "sanctionedRs": 19000000, "expenditureRs": 13300000,
  "progressPct": 62, "stalledDays": 96,
  "severity": "high",
  "decision": { "status": "action-required", "at": "…", "by": "…" } }   // latest or null
```

404 unknown/out-of-scope (SPEC 03b rule).

## `GET /api/v1/copilot/compare?ids=W-1014,W-1032`

```jsonc
// 200 — ToolCompareOut (the "compare these two works" brain path)
{ "works": [ { "id": "W-1014", "sanctionedRs": 19000000, "progressPct": 62,
               "peerMedianRs": 7800000, "peerN": 18, "severity": "high" },
             { "id": "W-1032", "sanctionedRs": 2510000, "progressPct": 48,
               "peerMedianRs": 2460000, "peerN": 18, "severity": null } ],
  "peerGroup": { "type": "community-hall", "state": "Madhya Pradesh" } }
```

Accepts 2–5 ids (422 otherwise). Every returned row re-uses `peer_comparison`
(`analytics-cache.md` §4.2), so the ratio a chip sentence quotes matches the dossier's peer
bar exactly. Ids outside scope are dropped silently (compare what you may see).

## `GET /api/v1/copilot/explain/{anomaly_id}`

```jsonc
// 200 — ToolExplainOut ("why was this flagged?" in one payload)
{ "anomalyId": "A-1", "workId": "W-1014", "kind": "cost", "severity": "high",
  "headline": "Cost 2.4× peer median",
  "peerN": 18, "peerMedianRs": 7800000, "actualRs": 19000000, "unit": "₹",
  "signals": [ { "label": "No progress update", "value": "96 days" } ],
  "corroboration": "Warrants manual review — spend and execution both deviate.",
  "detectorInputs": { "ratio": 2.4 } }
```

This is the same `AnomalyOut` payload SPEC 04b serves — the frontend template sentence and
the dossier's "Why flagged" box quote the *same stored strings*, byte-identical. 404 unknown
anomaly; 404 when the parent work is out of scope.

## Deliberate exclusions

- **No `/api/v1/ai/chat`.** Per ADR-025 the LLM decision is deferred; the scripted brain
  keeps calling these tools through server-fns. When an LLM lands, it sits *behind* the same
  tool schemas — tool payloads are already the minimal context an LLM needs.
- **No conversation persistence.** The copilot thread stays client-side (as SPEC 05 already
  models); the backend is stateless per tool call.
- No new caching: tool endpoints hit the same cached read models or cheap repo queries as the
  screens (analytics-cache.md §4.3 spirit — cache only where it pays).

## Acceptance (backend)

- Every tool endpoint returns contract shapes; contract tests assert the examples above
  key-for-key (same discipline as `api-reference.md`).
- Scope test: district officer's `/copilot/search?q=hall` never returns another district's
  work; `/copilot/explain/{A-1}` for an out-of-scope work → 404.
- Consistency test: `comparePeers` median for W-1014 equals the dossier's `peerMedianRs`
  and SPEC 00's pinned `24.6`.
