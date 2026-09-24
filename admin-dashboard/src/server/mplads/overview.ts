import { createServerFn } from "@tanstack/react-start";
import z from "zod";

import {
  anomaliesSchema,
  anomalyKindSchema,
  officerRoleSchema,
  severitySchema,
  workIdSchema,
  workStatusSchema,
  workTypeSchema,
  type Anomaly,
  type OfficerRole,
} from "@/lib/mplads-schema";

import { apiFetch, probeBackend } from "./api-client";

const yyyyMmDdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be yyyy-MM-dd");

/** CamelCase wire twins of the backend Pydantic models (see verify-api-contract.ts). */
export const kpiOutSchema = z.object({
  totalWorks: z.number(),
  underExecution: z.number(),
  delayed: z.number(),
  highRisk: z.number(),
  overrunExposureRs: z.number(),
});

export const liveWorkRowSchema = z.object({
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

const itemsSchema = <T extends z.ZodTypeAny>(item: T) => z.object({ items: z.array(item), total: z.number() });

export type KpiValues = z.infer<typeof kpiOutSchema>;
export type LiveWorkRow = z.infer<typeof liveWorkRowSchema>;

export type OverviewBundle =
  | { ok: true; kpis: KpiValues; rows: LiveWorkRow[]; anomalies: Anomaly[] }
  | { ok: false };

export const overviewRoleSchema = officerRoleSchema;

export type OverviewRole = OfficerRole;

const getOverviewBundleServer = createServerFn({ method: "GET" }).handler(
  async (): Promise<OverviewBundle> => {
    // Single probe per visit: unhealthy → seed instantly, zero data fetches.
    if (!(await probeBackend())) return { ok: false };
    try {
      const [kpisRaw, worksRaw, anomaliesRaw] = await Promise.all([
        apiFetch("/overview/kpis"),
        apiFetch("/works?pageSize=200&lens=all"),
        apiFetch("/anomalies?limit=200"),
      ]);
      return {
        ok: true,
        kpis: kpiOutSchema.parse(kpisRaw),
        rows: itemsSchema(liveWorkRowSchema).parse(worksRaw).items,
        anomalies: z.object({ items: anomaliesSchema }).parse(anomaliesRaw).items,
      };
    } catch (error) {
      console.warn("[mplads] live overview failed, falling back to seed:", error instanceof Error ? error.message : error);
      return { ok: false };
    }
  },
);

/** Backend-first, seed-fallback: never throws — unhealthy API means `{ ok: false }`. */
export async function getOverviewBundle(): Promise<OverviewBundle> {
  return getOverviewBundleServer();
}
