import { anomalies, works } from "@/lib/mplads-mock";
import type { Anomaly, AnomalyKind, OfficerRole, Severity, Work } from "@/lib/mplads-schema";

export type RowSeverity = Severity | "clear";

export interface WorkRow {
  id: string;
  title: string;
  agency: string;
  type: Work["type"];
  district: string;
  state: string;
  sanctionedRs: number;
  progressPct: number;
  status: Work["status"];
  lastUpdate: string;
  severity: RowSeverity;
  kind: AnomalyKind | null;
  search: string;
}

export type Lens = "all" | "needs-review" | "high-risk";

const SEVERITY_RANK: Record<RowSeverity, number> = { high: 0, medium: 1, low: 2, clear: 3 };

function scopeWorks(role: OfficerRole): Work[] {
  if (role === "district") {
    return works.filter((work) => work.district === "Bhopal");
  }
  if (role === "state") {
    return works.filter((work) => work.state === "Madhya Pradesh");
  }
  return works;
}

function flagFor(workId: string): Anomaly | undefined {
  let best: Anomaly | undefined;
  for (const anomaly of anomalies) {
    if (anomaly.workId !== workId) {
      continue;
    }
    if (!best || SEVERITY_RANK[anomaly.severity] < SEVERITY_RANK[best.severity]) {
      best = anomaly;
    }
  }
  return best;
}

export function buildWorksRows(role: OfficerRole): WorkRow[] {
  return scopeWorks(role)
    .map((work) => {
      const flag = flagFor(work.id);
      return {
        id: work.id,
        title: work.title,
        agency: work.agency,
        type: work.type,
        district: work.district,
        state: work.state,
        sanctionedRs: work.sanctionedRs,
        progressPct: work.progressPct,
        status: work.status,
        lastUpdate: work.lastUpdate,
        severity: flag ? flag.severity : "clear",
        kind: flag ? flag.kind : null,
        search: `${work.id} ${work.title} ${work.agency}`.toLowerCase(),
      } satisfies WorkRow;
    })
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.sanctionedRs - a.sanctionedRs);
}

export function filterByLens(rows: WorkRow[], lens: Lens): WorkRow[] {
  if (lens === "high-risk") {
    return rows.filter((row) => row.severity === "high");
  }
  if (lens === "needs-review") {
    return rows.filter((row) => row.severity !== "clear");
  }
  return rows;
}

export function lensCounts(rows: WorkRow[]): { all: number; review: number; high: number } {
  return {
    all: rows.length,
    review: rows.filter((row) => row.severity !== "clear").length,
    high: rows.filter((row) => row.severity === "high").length,
  };
}

export const STATE_OPTIONS = [...new Set(works.map((work) => work.state))].sort((a, b) => a.localeCompare(b));

export const DISTRICT_OPTIONS = [...new Set(works.map((work) => work.district))].sort((a, b) => a.localeCompare(b));

export const TYPE_OPTIONS = [...new Set(works.map((work) => work.type))].sort((a, b) => a.localeCompare(b));

export const DOSSIER_ENTRY_SEARCH = {
  tab: "anomalies",
  view: "grid",
  lens: "all",
  state: "",
  district: "",
  type: "",
  q: "",
} as const;
