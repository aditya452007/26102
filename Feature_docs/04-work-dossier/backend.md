# SPEC 04b — Work Dossier Backend (`/api/v1/works/{id}/dossier`)

> Backend for SPEC 04, the differentiator screen. One bundle endpoint feeds the whole page
> (tabs + DecisionBar + ContextualAI suggestions); one POST per user action. Wire shapes fixed
> in `api-reference.md` §Dossier/§Evidence/§Decisions. Every "why flagged" number the screen
> renders comes from **stored** `anomalies` rows (`detector_inputs` JSONB) — the backend never
> recomputes on read (analytics-cache.md §1), so the explanation is stable and auditable.

## The bundle — `GET /api/v1/works/{work_id}/dossier`

```jsonc
// 200 — DossierOut  ·  assembled per request, NOT cached (analytics-cache.md §4.3)
{
  "work":     { /* WorkOut — SPEC 03b shape */ },
  "anomalies": [ /* AnomalyOut[] — sorted high→medium→low, then detected_at */ ],
  "evidence": [ /* EvidenceOut[] — newest first */ ],
  "activity": [ /* ActivityOut[] — newest first */ ],
  "decision": { "status": "action-required", "note": "…", "at": "…", "by": "…" },  // latest, or null
  "financials": {                       // feeds Financials tab (line + donut)
    "sanctionedLakh": 58.9, "expenditureLakh": 41.2,
    "utilisationPct": 70,
    "peerMedianLakh": 24.6,             // null when peer_n < 8 → honesty UI, SPEC 04 Anomalies tab
    "peerN": 18 },
  "progress": [                         // Progress tab milestones — v1 = derived, see below
    { "stage": "Foundation", "plannedPct": 25, "actualPct": 30 },
    { "stage": "Lintel", "plannedPct": 50, "actualPct": 45 },
    { "stage": "Roofing", "plannedPct": 75, "actualPct": 60 },
    { "stage": "Finishing", "plannedPct": 100, "actualPct": 62 } ],
  "ai": { "suggestions": [              // SPEC 04's 3 suggestion chips
    "Why was this flagged?", "Compare with peers", "What's missing?" ] }
}
```

Per-tab provenance:

| Frontend tab | Source | Notes |
|---|---|---|
| Overview | `work` fields | utilisation = `expenditure/sanctioned`; stall callout uses `stalledDays` |
| Financials | `financials` + stored anomalies | peer-median dashed band = `peerMedianLakh` (null → no band, per SPEC 04 honesty rule) |
| Progress | `progress` | **v1 derivation**: split `progressPct` across the 4 fixed SPEC 04 stages (planned = due-date-proportional, actual = reported); real milestone data arrives with ingest — no contract change |
| Anomalies | `anomalies[]` | each row already carries headline, peer stats, `signals[]`, corroboration |
| Evidence | `evidence[]` | `storage_path` null in seed → frontend shows seeded metadata only |
| Activity | `activity[]` | includes decision-written entries (transactions, §Decisions) |
| DecisionBar | `decision` | latest `work_decisions` row, or `null` before any decision |

404 (unknown or out-of-scope id) — same rule as SPEC 03b: reads never 403.

## `AnomalyOut` — the "why flagged" payload (per anomaly)

```jsonc
{ "id": "A-1", "workId": "W-1014", "kind": "cost", "severity": "high",
  "headline": "Cost 2.4× peer median",
  "peerN": 18, "peerMedianLakh": 24.6, "actualLakh": 58.9, "unit": "₹L",
  "corroboration": "Warrants manual review — spend and execution both deviate.",
  "signals": [ { "label": "No progress update", "value": "96 days" } ],
  "detectorVersion": "rules-1.0",
  "detectorInputs": { "ratio": 2.4, "peerMedianLakh": 24.6, "actualLakh": 58.9,
                      "peerType": "community-hall", "peerState": "Madhya Pradesh" } }
```

`signals` are reassembled from `anomaly_signals` (ordered by `position`); `detectorInputs` is
the stored JSONB verbatim — the dossier's "Why flagged" box renders these, so a changed
formula without a recompute cannot silently change an explanation.

## Writes (SPEC 04's two user actions)

### `POST /api/v1/works/{work_id}/evidence`

`multipart/form-data`: `file` (required) + `kind` ∈ `doc|photo|report` (required) + optional
`note`. Server: scope-check (403 outside scope) → store under `EVIDENCE_DIR/{work_id}/{ulid}
_{filename}` → insert row (`size_kb` measured, `by` = officer display name, `storage_path`
set — unlike seed rows). 10 MB cap, allowed mime `application/pdf`, `image/*` (415 otherwise).
201 with the created `EvidenceOut`. Storage is local disk for v1 (config `EVIDENCE_DIR`);
S3 later is a service-internal swap, contract unchanged. Files are **additive only** — no
delete endpoint in v1 (SPEC 04 out-of-scope).

### `POST /api/v1/works/{work_id}/decisions`

```jsonc
// Request — DecisionIn
{ "status": "verified|dismissed|action-required", "note": "Site verified on 12 Sep" }
// 201 — DecisionOut (single row)
{ "id": "T-34", "workId": "W-1014", "status": "action-required",
  "note": "Site verified on 12 Sep", "at": "2026-09-14T10:32:00Z", "by": "Demo Officer" }
```

Transactional contract (SPEC 04's "writes to the activity log"): decision insert **and**
activity append commit together or not at all (`db_session(serialized=True)`). The activity
row: `actor = officer.fullName`, `action = "Decision: {status}"`, `note` = same text, `at` =
same instant — the Activity tab and the DecisionBar can never disagree. Scope-check before
write (403 outside scope). Note is required for `action-required` (SPEC 04 placeholder law),
optional otherwise; empty note + `action-required` → 422.

## ContextualAI suggestions

The `ai.suggestions` array is **static v1** (the three chips above, always present). The
deterministic copilot tools behind "Ask AI" live in SPEC 05b; no LLM is called (ADR-025).

## Acceptance (backend)

- Dossier for W-1014: A-1 first, `peerN 18 / median 24.6`, evidence newest-first, decision
  `null` on fresh seed — parity test pins these.
- Decision POST → 201; activity feed in the same dossier response now contains the
  decision entry (read-your-write in one round trip).
- Out-of-scope decision POST → 403 and **no** activity row exists (transaction rollback
  test).
- Evidence POST persists under `EVIDENCE_DIR`, row lists in the dossier; oversized/mime-
  rejected upload → 415/413 with the shared error shape.
