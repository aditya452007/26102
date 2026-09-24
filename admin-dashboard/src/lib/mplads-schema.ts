import z from "zod";

export const workIdSchema = z.string().regex(/^W-\d{4}$/, "Work id must look like W-1014");

export const workTypeSchema = z.enum(["road", "community-hall", "water", "school", "drainage", "streetlight"]);

export const workStatusSchema = z.enum(["in-execution", "completed", "sanctioned", "stalled"]);

export const anomalyKindSchema = z.enum(["cost", "expenditure", "delay", "duplicate", "utilisation"]);

export const severitySchema = z.enum(["high", "medium", "low"]);

export const evidenceKindSchema = z.enum(["doc", "photo", "report"]);

export const decisionStatusSchema = z.enum(["verified", "dismissed", "action-required"]);

export const officerRoleSchema = z.enum(["district", "state", "ministry"]);

const yyyyMmDdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be yyyy-MM-dd");

const isoStringSchema = z.string().min(1, "ISO timestamp must not be empty");

export const workSchema = z.object({
  id: workIdSchema,
  title: z.string().min(1),
  type: workTypeSchema,
  state: z.string().min(1),
  district: z.string().min(1),
  agency: z.string().min(1),
  status: workStatusSchema,
  sanctionedRs: z.number().int().nonnegative(),
  expenditureRs: z.number().int().nonnegative(),
  progressPct: z.number().min(0).max(100),
  sanctionDate: yyyyMmDdSchema,
  dueDate: yyyyMmDdSchema,
  lastUpdate: yyyyMmDdSchema,
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  tenderHolder: z.string().min(1),
  tenderAwardedBy: z.string().min(1),
  department: z.string().min(1),
  labourDeployed: z.number().int().min(0),
  demandedDays: z.number().int().min(1),
  returnedRs: z.number().int().nonnegative(),
});

export const anomalySignalSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const anomalySchema = z.object({
  id: z.string().regex(/^A-\d+$/, "Anomaly id must look like A-1"),
  workId: workIdSchema,
  kind: anomalyKindSchema,
  severity: severitySchema,
  headline: z.string().min(1),
  peerN: z.number().int().min(8),
  peerMedianRs: z.number().int().nonnegative().nullable(),
  actualRs: z.number().int().nonnegative().nullable(),
  unit: z.literal("₹"),
  corroboration: z.string().min(1),
  signals: z.array(anomalySignalSchema).min(1, "Every flag needs at least one corroborating signal"),
});

export const evidenceSchema = z.object({
  id: z.string().regex(/^E-\d+$/, "Evidence id must look like E-1"),
  workId: workIdSchema,
  kind: evidenceKindSchema,
  name: z.string().min(1),
  sizeKb: z.number().positive(),
  uploadedAt: isoStringSchema,
  by: z.string().min(1),
});

export const activitySchema = z.object({
  id: z.string().min(1),
  workId: workIdSchema,
  at: isoStringSchema,
  actor: z.string().min(1),
  action: z.string().min(1),
  note: z.string().optional(),
});

export const decisionSchema = z.object({
  workId: workIdSchema,
  status: decisionStatusSchema,
  note: z.string(),
  at: isoStringSchema,
  by: z.string().min(1),
});

export const worksSchema = z.array(workSchema);

export const anomaliesSchema = z.array(anomalySchema);

export const evidencesSchema = z.array(evidenceSchema);

export const activitiesSchema = z.array(activitySchema);

export const seedBundleSchema = z.object({
  works: worksSchema,
  anomalies: anomaliesSchema,
  evidences: evidencesSchema,
  activities: activitiesSchema,
});

export type Work = z.infer<typeof workSchema>;
export type WorkType = z.infer<typeof workTypeSchema>;
export type WorkStatus = z.infer<typeof workStatusSchema>;
export type Anomaly = z.infer<typeof anomalySchema>;
export type AnomalyKind = z.infer<typeof anomalyKindSchema>;
export type Severity = z.infer<typeof severitySchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type Decision = z.infer<typeof decisionSchema>;
export type OfficerRole = z.infer<typeof officerRoleSchema>;
export type SeedBundle = z.infer<typeof seedBundleSchema>;
