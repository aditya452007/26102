import { differenceInCalendarDays, format } from "date-fns";
import { Building2, Droplets, GraduationCap, Lightbulb, Route as RouteIcon, Waves } from "lucide-react";

import { activities, anomalies, DEMO_TODAY_ISO, evidences, MPLADS_STORAGE_KEY, works } from "@/lib/mplads-mock";
import {
  type Activity,
  type Anomaly,
  type Decision,
  decisionSchema,
  type Evidence,
  type Severity,
  type Work,
} from "@/lib/mplads-schema";

export type DossierTab = "overview" | "financials" | "progress" | "anomalies" | "evidence" | "activity";

export const DOSSIER_TABS: DossierTab[] = ["overview", "financials", "progress", "anomalies", "evidence", "activity"];

const TAB_LABELS: Record<DossierTab, string> = {
  activity: "Activity",
  anomalies: "Anomalies",
  evidence: "Evidence",
  financials: "Financials",
  overview: "Overview",
  progress: "Progress",
};

export function tabLabel(tab: DossierTab): string {
  return TAB_LABELS[tab];
}

export function parseTab(value: unknown): DossierTab {
  return DOSSIER_TABS.includes(value as DossierTab) ? (value as DossierTab) : "overview";
}

export type EvidenceView = "grid" | "list";

export function parseEvidenceView(value: unknown): EvidenceView {
  return value === "list" ? "list" : "grid";
}

export interface DossierSearch {
  tab: DossierTab;
  view: EvidenceView;
}

export type DecisionStatus = Decision["status"];

export const DECISION_META: Record<DecisionStatus, { label: string; dot: string }> = {
  "action-required": { dot: "bg-amber-500", label: "Action required" },
  dismissed: { dot: "bg-muted-foreground", label: "Dismissed" },
  verified: { dot: "bg-emerald-500", label: "Verified" },
};

export const TYPE_ICONS = {
  road: RouteIcon,
  "community-hall": Building2,
  water: Droplets,
  school: GraduationCap,
  drainage: Waves,
  streetlight: Lightbulb,
} as const;

export const TYPE_LABELS: Record<Work["type"], string> = {
  "community-hall": "Community hall",
  drainage: "Drainage",
  road: "Road",
  school: "School",
  streetlight: "Streetlight",
  water: "Water",
};

export const SEVERITY_STYLES: Record<Severity | "clear", string> = {
  clear: "border-muted-foreground/20 bg-muted text-muted-foreground",
  high: "border-destructive/20 bg-destructive/10 text-destructive",
  low: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  medium: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export const SEVERITY_DOT: Record<Severity | "clear", string> = {
  clear: "bg-muted-foreground",
  high: "bg-destructive",
  low: "bg-sky-500",
  medium: "bg-amber-500",
};

export const SEVERITY_BAR: Record<Severity, string> = {
  high: "bg-destructive",
  low: "bg-sky-500",
  medium: "bg-amber-500",
};

const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

function parseDay(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dayString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export interface Dossier {
  work: Work;
  flags: Anomaly[];
  evidence: Evidence[];
  activity: Activity[];
  stallDays: number;
  utilisationPct: number;
}

export function getDossier(workId: string): Dossier | undefined {
  const work = works.find((candidate) => candidate.id === workId);
  if (!work) {
    return undefined;
  }
  const flags = anomalies
    .filter((anomaly) => anomaly.workId === workId)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  const evidence = evidences.filter((item) => item.workId === workId);
  const activity = activities.filter((item) => item.workId === workId).sort((a, b) => (a.at < b.at ? 1 : -1));
  const stallDays = differenceInCalendarDays(parseDay(DEMO_TODAY_ISO), parseDay(work.lastUpdate));
  const utilisationPct = work.sanctionedRs > 0 ? (work.expenditureRs / work.sanctionedRs) * 100 : 0;
  return { work, flags, evidence, activity, stallDays, utilisationPct };
}

export interface SpendPoint {
  month: string;
  spent: number;
  peer: number;
}

function seedOf(id: string): number {
  let seed = 0;
  for (const char of id) {
    seed = (seed + char.charCodeAt(0)) % 997;
  }
  return seed;
}

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function spendSeries(work: Work, peerMedianRs: number | null): { data: SpendPoint[]; peerLabel: string } {
  const seed = seedOf(work.id);
  const [year, month] = work.sanctionDate.split("-").map(Number);
  const raw: number[] = [];
  for (let index = 0; index < 12; index += 1) {
    const wiggle = 1 + 0.06 * Math.sin(seed + index * 1.7);
    raw.push(Math.max(work.expenditureRs * ((index + 1) / 12) ** 0.92 * wiggle, 0));
  }
  const scale = raw[11] > 0 ? work.expenditureRs / raw[11] : 0;
  const peerTotal = peerMedianRs ?? work.sanctionedRs;
  const data = raw.map((value, index) => ({
    month: format(new Date(year, month - 1 + index, 1), "MMM yy"),
    peer: oneDecimal((peerTotal * (index + 1)) / 12),
    spent: oneDecimal(value * scale),
  }));
  return { data, peerLabel: peerMedianRs === null ? "Sanctioned plan" : "Peer median" };
}

export interface Milestone {
  name: string;
  dueLabel: string;
  plannedPct: number;
  actualPct: number;
}

const MILESTONE_NAMES = ["Foundation", "Lintel", "Roofing", "Finishing"];

function formatWorkDay(yyyyMmDd: string): string {
  return format(parseDay(yyyyMmDd), "d MMM yyyy");
}

export function milestonesFor(work: Work): Milestone[] {
  const start = parseDay(work.sanctionDate).getTime();
  const end = parseDay(work.dueDate).getTime();
  const span = Math.max(end - start, 1);
  const elapsed = Math.min(Math.max((parseDay(DEMO_TODAY_ISO).getTime() - start) / span, 0), 1);
  return MILESTONE_NAMES.map((name, index) => {
    const due = new Date(start + (span * (index + 1)) / MILESTONE_NAMES.length);
    const plannedPct = Math.round(Math.min(Math.max((elapsed - index / 4) / (1 / 4), 0), 1) * 100);
    const actualPct = Math.round(Math.min(Math.max(work.progressPct - index * 25, 0), 25) * 4);
    return { name, dueLabel: formatWorkDay(dayString(due)), plannedPct, actualPct };
  });
}

export function elapsedSinceSanction(work: Work): number {
  return differenceInCalendarDays(parseDay(DEMO_TODAY_ISO), parseDay(work.sanctionDate));
}

export function tenderScheduleLabel(work: Work): string {
  return `${work.demandedDays}d demanded · ${elapsedSinceSanction(work)}d elapsed`;
}

export function relativeDay(iso: string): string {
  const diff = differenceInCalendarDays(parseDay(DEMO_TODAY_ISO), parseDay(iso.slice(0, 10)));
  if (diff <= 0) {
    return "today";
  }
  if (diff === 1) {
    return "yesterday";
  }
  return `${diff}d ago`;
}

export function formatSize(sizeKb: number): string {
  if (sizeKb >= 1024) {
    return `${(sizeKb / 1024).toFixed(1)} MB`;
  }
  return `${Math.round(sizeKb)} KB`;
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function readDecisionStore(): Record<string, Decision> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(MPLADS_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    const store: Record<string, Decision> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const result = decisionSchema.safeParse(value);
      if (result.success && result.data.workId === key) {
        store[key] = result.data;
      }
    }
    return store;
  } catch {
    return {};
  }
}

export function loadDecision(workId: string): Decision | undefined {
  return readDecisionStore()[workId];
}

export function saveDecision(decision: Decision): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      MPLADS_STORAGE_KEY,
      JSON.stringify({ ...readDecisionStore(), [decision.workId]: decision }),
    );
  } catch {
    // Quota or privacy mode: the demo keeps the decision in memory for this session.
  }
}

export function decisionActivity(decision: Decision): Activity {
  return {
    id: `D-${decision.workId}-${decision.at}`,
    workId: decision.workId,
    at: decision.at,
    actor: decision.by,
    action: `Recorded ${DECISION_META[decision.status].label.toLowerCase()} (demo)`,
    note: decision.note,
  };
}
