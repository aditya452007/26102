/**
 * DEV-ONLY contract gate for the live API (never shipped, never imported by the app).
 *
 * Parses the curl-captured JSON bodies in backend/.run/verify/ against the REAL
 * frontend Zod schemas (src/lib/mplads-schema.ts) — the same schemas every screen
 * parses with. Any mismatch between the API and the frontend contract fails here.
 *
 * Run from admin-dashboard/ after the curl matrix:
 *   npx -y tsx scripts/verify-api-contract.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  workIdSchema,
  workTypeSchema,
  workStatusSchema,
  severitySchema,
  anomalyKindSchema,
  workSchema,
  anomalySchema,
  evidenceSchema,
  activitySchema,
  decisionSchema,
} from "../src/lib/mplads-schema.js";

// Not exported by mplads-schema.ts (internal) — same regex as there.
const yyyyMmDdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const here = dirname(fileURLToPath(import.meta.url));
const verify = resolve(here, "../../backend/.run/verify");

function read(name: string): unknown {
  const p = resolve(verify, name);
  if (!existsSync(p)) return undefined;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return undefined;
  }
}

function expectOk(name: string, data: unknown, schema: z.ZodTypeAny, label: string) {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.log(`✗ ${label} (${name}):`, result.error.issues.slice(0, 3));
    process.exitCode = 1;
  } else {
    console.log(`✓ ${label} (${name})`);
  }
}

// The ledger row is the buildWorksRows projection (id/title/agency/type/district/state/
// sanctionedRs/progressPct/status/lastUpdate + severity/kind), NOT the full workSchema —
// so the gate parses it with the projection the works screen actually consumes.
const workRowSchema = z.object({
  id: workIdSchema,
  title: z.string().min(1),
  agency: z.string().min(1),
  type: workTypeSchema,
  district: z.string().min(1),
  state: z.string().min(1),
  sanctionedRs: z.number().int().nonnegative(),
  progressPct: z.number().min(0).max(100),
  status: workStatusSchema,
  lastUpdate: yyyyMmDdSchema,
  severity: severitySchema.nullable(),
  kind: anomalyKindSchema.nullable(),
});

// G4 — work detail
expectOk("g4.body", read("g4.body"), workSchema, "work detail = workSchema");

// G5 — dossier: work + anomalies[] + evidence[] + activity[] (+ decision?)
const dossierSchema = z.object({
  work: workSchema,
  anomalies: z.array(anomalySchema),
  evidence: z.array(evidenceSchema),
  activity: z.array(activitySchema),
  decision: decisionSchema.nullable().optional(),
});
expectOk("g5.body", read("g5.body"), dossierSchema, "dossier = bundle schema (no peers — ADR-031)");

// G2 — ledger page → items parse as the ledger-row projection
const ledger = read("g2.body") as { items?: unknown } | undefined;
expectOk(
  "g2.body",
  ledger?.items,
  z.array(workRowSchema),
  "ledger items = WorkRow[]",
);

// G7 — anomalies list → items parse as Anomaly[]
const flags = read("g7.body") as { items?: unknown } | undefined;
expectOk("g7.body", flags?.items, z.array(anomalySchema), "anomaly items = Anomaly[]");

// G11c — copilot explain = { anomaly, work }
const explain = read("g11c.body") as Record<string, unknown> | undefined;
expectOk(
  "g11c.body",
  explain?.anomaly,
  anomalySchema,
  "explain anomaly = Anomaly",
);

// u1 — uploaded evidence parses as Evidence
expectOk("u1.body", read("u1.body"), evidenceSchema, "uploaded evidence = Evidence");

// g13 — recorded decision (id is the API's string form, not in the mock schema;
// must be a REAL value, never "None")
const apiDecisionSchema = decisionSchema.extend({ id: z.string().min(1) });
const dec = read("g13.body") as Record<string, unknown> | undefined;
expectOk("g13.body", dec, apiDecisionSchema, "decision = Decision (+id)");
if (dec && (dec.id === "None" || dec.id === "")) {
  console.log("✗ decision id is literally 'None' — flush bug regression");
  process.exitCode = 1;
} else if (dec) {
  console.log(`✓ decision id is a real value: ${String(dec.id)}`);
}
