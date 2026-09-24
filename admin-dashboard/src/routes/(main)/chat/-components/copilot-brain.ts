import { differenceInCalendarDays } from "date-fns";

import { anomalies, compareSentence, DEMO_TODAY_ISO, evidences, formatMoneyRs, works } from "@/lib/mplads-mock";
import type { Anomaly, Work } from "@/lib/mplads-schema";

function parseDay(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function stallDays(work: Work): number {
  return differenceInCalendarDays(parseDay(DEMO_TODAY_ISO), parseDay(work.lastUpdate));
}

type Flagged = { work: Work; flag: Anomaly };

function topFlag(workId: string): Flagged | undefined {
  const work = works.find((candidate) => candidate.id === workId);
  if (!work) {
    return undefined;
  }
  const rank: Record<Anomaly["severity"], number> = { high: 0, medium: 1, low: 2 };
  const flag = anomalies
    .filter((anomaly) => anomaly.workId === workId)
    .sort((a, b) => rank[a.severity] - rank[b.severity])[0];
  return flag ? { work, flag } : undefined;
}

function explainWork(work: Work, flag: Anomaly | undefined): string {
  if (!flag) {
    return `#${work.id} ${work.title} in ${work.district} has no open flags in the demo data. Sanctioned ${formatMoneyRs(work.sanctionedRs)}, spent ${formatMoneyRs(work.expenditureRs)}, ${work.progressPct}% complete, held by ${work.tenderHolder} (${work.department}).`;
  }
  const numbers =
    flag.actualRs !== null && flag.peerMedianRs !== null
      ? `${compareSentence(flag.actualRs, flag.peerMedianRs, flag.peerN, work.type, work.district)}. `
      : "";
  return `#${work.id}: ${flag.headline}. ${numbers}${flag.corroboration} Tender with ${work.tenderHolder} via ${work.tenderAwardedBy}; ${work.labourDeployed} labour deployed; evidence files attached: ${evidences.filter((item) => item.workId === work.id).length}.`;
}

function listHighRisk(): string {
  const items = anomalies
    .filter((anomaly) => anomaly.severity === "high")
    .map((anomaly) => {
      const work = works.find((candidate) => candidate.id === anomaly.workId);
      return work ? `#${work.id} ${work.title} (${formatMoneyRs(anomaly.actualRs ?? work.sanctionedRs)})` : null;
    })
    .filter((line): line is string => line !== null);
  return `${items.length} high-risk works need review: ${items.join(" · ")}. Open any of them from the Works queue to see the full dossier.`;
}

function longestStalls(): string {
  const rows = [...works]
    .map((work) => ({ work, days: stallDays(work) }))
    .sort((a, b) => b.days - a.days)
    .slice(0, 5);
  return `Longest without a field update: ${rows.map(({ work, days }) => `#${work.id} ${days}d`).join(" · ")}. Reports are expected fortnightly for works in execution.`;
}

function pendingUCs(): string {
  const pending = anomalies.filter((anomaly) => anomaly.kind === "utilisation");
  if (pending.length === 0) {
    return "No utilisation certificates are pending in the demo data.";
  }
  return `UCs pending: ${pending
    .map((anomaly) => {
      const work = works.find((candidate) => candidate.id === anomaly.workId);
      return work ? `#${work.id} ${work.title}` : anomaly.workId;
    })
    .join(" · ")}. See UC Tracking in the sidebar for the full list.`;
}

function tenderSummary(workId: string | undefined): string {
  const work = (workId && works.find((candidate) => candidate.id === workId)) ?? works.find((w) => w.id === "W-1014");
  if (!work) {
    return "I could not find that work in the demo data.";
  }
  return `#${work.id}: tender held by ${work.tenderHolder}, awarded by ${work.tenderAwardedBy} (${work.department}). ${work.labourDeployed} labour deployed, ${work.demandedDays}d demanded for construction.`;
}

function capabilities(): string {
  return `I answer from the demo dataset (${works.length} works, ${anomalies.length} open flags). Try: "why was W-1014 flagged?", "list high-risk works", "longest stalls", "UCs pending", "tender for W-1010", or "compare W-1014 with peers". Flags mean needs review, never fraud.`;
}

export function answerCopilot(question: string): string {
  const text = question.toLowerCase();
  const ids = [...question.toUpperCase().matchAll(/W-(\d{4})/g)].map((match) => `W-${match[1]}`);
  const knownIds = ids.filter((id) => works.some((work) => work.id === id));

  if (/(help|what can you|how do i|start)/.test(text) && knownIds.length === 0) {
    return capabilities();
  }
  if (/high.?risk|list.*flag|all.*flag|needs review/.test(text)) {
    return listHighRisk();
  }
  if (/stall|delay|overdue|quiet/.test(text)) {
    return longestStalls();
  }
  if (/uc\b|utilisation|certificate/.test(text)) {
    return pendingUCs();
  }
  if (/tender|department|labour|contractor/.test(text)) {
    return tenderSummary(knownIds[0]);
  }
  if (/compar/.test(text)) {
    const target = knownIds[0] ?? "W-1014";
    const found = topFlag(target);
    if (found && found.flag.actualRs !== null && found.flag.peerMedianRs !== null) {
      const ratio =
        found.flag.peerMedianRs > 0 ? (found.flag.actualRs / found.flag.peerMedianRs).toFixed(1) : "—";
      return `${compareSentence(found.flag.actualRs, found.flag.peerMedianRs, found.flag.peerN, found.work.type, found.work.district)} — ${ratio}× the peer median. ${found.flag.corroboration}`;
    }
    return found ? explainWork(found.work, found.flag) : capabilities();
  }
  if (knownIds.length > 0) {
    const found = topFlag(knownIds[0]);
    if (found) {
      return explainWork(found.work, found.flag);
    }
    const work = works.find((candidate) => candidate.id === knownIds[0]);
    return work ? explainWork(work, undefined) : capabilities();
  }
  if (/overview|scheme|summary|kpi|how many/.test(text)) {
    return `Scheme snapshot: ${works.length} demo works with ${anomalies.length} open flags (${anomalies.filter((a) => a.severity === "high").length} high-risk). The full scheme tracks thousands more — see Overview for the scheme-wide KPIs.`;
  }
  if (/evidence|document|photo|file/.test(text)) {
    return `${evidences.length} evidence files are attached across flagged works in the demo data. Open a dossier's Evidence tab to inspect them.`;
  }
  return `I did not follow that — ${capabilities()}`;
}

export function copilotGreeting(): string {
  return `Namaste, officer. I watch ${works.length} demo works with ${anomalies.length} open flags (${anomalies.filter((a) => a.severity === "high").length} high-risk). Ask me why any work was flagged, or say help.`;
}
