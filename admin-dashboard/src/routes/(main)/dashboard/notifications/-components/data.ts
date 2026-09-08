import { differenceInCalendarDays } from "date-fns";

import { anomalies, DEMO_TODAY_ISO, works } from "@/lib/mplads-mock";
import type { NotifKind } from "@/lib/notif-prefs";

export interface OfficerNotification {
  id: string;
  kind: NotifKind;
  title: string;
  description: string;
  workId: string;
  ageDays: number;
}

function parseDay(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysSince(yyyyMmDd: string): number {
  return differenceInCalendarDays(parseDay(DEMO_TODAY_ISO), parseDay(yyyyMmDd));
}

const KIND_RANK: Record<NotifKind, number> = { "high-risk": 0, stall: 1, uc: 2, overdue: 3 };

export function buildNotifications(): OfficerNotification[] {
  const rows: OfficerNotification[] = [];

  for (const anomaly of anomalies) {
    const work = works.find((candidate) => candidate.id === anomaly.workId);
    if (!work) {
      continue;
    }
    if (anomaly.severity === "high") {
      rows.push({
        id: `N-high-${work.id}`,
        kind: "high-risk",
        title: `${work.id} flagged ${anomaly.kind} — high priority`,
        description: anomaly.headline,
        workId: work.id,
        ageDays: daysSince(work.lastUpdate),
      });
    }
    if (anomaly.kind === "utilisation") {
      rows.push({
        id: `N-uc-${work.id}`,
        kind: "uc",
        title: `${work.id} utilisation certificate pending`,
        description: "Next tranche is blocked until the UC for the last release is attached.",
        workId: work.id,
        ageDays: daysSince(work.lastUpdate),
      });
    }
  }

  for (const work of works) {
    if (work.status === "stalled") {
      rows.push({
        id: `N-stall-${work.id}`,
        kind: "stall",
        title: `${work.id} stalled — no field update in ${daysSince(work.lastUpdate)}d`,
        description: `${work.title} in ${work.district} is past the 90-day review threshold.`,
        workId: work.id,
        ageDays: daysSince(work.lastUpdate),
      });
    } else if (work.status !== "completed" && work.dueDate < DEMO_TODAY_ISO) {
      rows.push({
        id: `N-overdue-${work.id}`,
        kind: "overdue",
        title: `${work.id} past due date`,
        description: `Due ${work.dueDate} at ${work.progressPct}% progress — needs review.`,
        workId: work.id,
        ageDays: daysSince(work.dueDate),
      });
    }
  }

  return rows.sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || b.ageDays - a.ageDays);
}
