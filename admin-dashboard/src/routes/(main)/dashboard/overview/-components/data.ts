import { anomalies, compareSentence, FLAGSHIP_WORK_ID, works } from "@/lib/mplads-mock";
import type { Anomaly, OfficerRole, Work } from "@/lib/mplads-schema";

const SEVERITY_RANK: Record<Anomaly["severity"], number> = { high: 0, medium: 1, low: 2 };

export function scopeWorks(role: OfficerRole): Work[] {
  if (role === "district") {
    return works.filter((work) => work.district === "Bhopal");
  }
  if (role === "state") {
    return works.filter((work) => work.state === "Madhya Pradesh");
  }
  return works;
}

export interface QueueRow {
  work: QueueWork;
  anomaly: Anomaly;
  reason: string;
}

/** Minimal work shape the queue and map actually read — seed Works and live API rows both satisfy it. */
export type QueueWork = Pick<Work, "id" | "title" | "type" | "district" | "state" | "sanctionedRs">;

function reasonFor(work: QueueWork, anomaly: Anomaly): string {
  if (anomaly.actualRs !== null && anomaly.peerMedianRs !== null) {
    return compareSentence(anomaly.actualRs, anomaly.peerMedianRs, anomaly.peerN, work.type, work.district);
  }
  return anomaly.headline;
}

function amountOf(work: QueueWork, anomaly: Anomaly): number {
  return anomaly.actualRs ?? work.sanctionedRs;
}

export function topQueue(scoped: QueueWork[], flags: Anomaly[] = anomalies): QueueRow[] {
  const byId = new Map(scoped.map((work) => [work.id, work]));
  return flags
    .flatMap((anomaly) => {
      const work = byId.get(anomaly.workId);
      return work ? [{ work, anomaly, reason: reasonFor(work, anomaly) }] : [];
    })
    .sort((a, b) => {
      if (a.work.id === FLAGSHIP_WORK_ID) {
        return -1;
      }
      if (b.work.id === FLAGSHIP_WORK_ID) {
        return 1;
      }
      return (
        SEVERITY_RANK[a.anomaly.severity] - SEVERITY_RANK[b.anomaly.severity] ||
        amountOf(b.work, b.anomaly) - amountOf(a.work, a.anomaly)
      );
    })
    .slice(0, 8);
}

export interface DistrictSlice {
  district: string;
  works: number;
  high: number;
}

export function scopedDistrictGeo(
  scoped: Array<Pick<Work, "district" | "id">>,
  flags: Anomaly[] = anomalies,
): DistrictSlice[] {
  const highByWork = new Set(flags.filter((a) => a.severity === "high").map((a) => a.workId));
  const byDistrict = new Map<string, DistrictSlice>();
  for (const work of scoped) {
    const entry = byDistrict.get(work.district) ?? { district: work.district, works: 0, high: 0 };
    entry.works += 1;
    if (highByWork.has(work.id)) {
      entry.high += 1;
    }
    byDistrict.set(work.district, entry);
  }
  return [...byDistrict.values()].sort((a, b) => a.district.localeCompare(b.district));
}

export function getOverviewData(
  role: OfficerRole,
  selectedDistrict: string,
): { queue: QueueRow[]; geo: DistrictSlice[] } {
  const scoped = scopeWorks(role);
  const inScope =
    selectedDistrict && scoped.some((work) => work.district === selectedDistrict) ? selectedDistrict : "";
  const visible = inScope ? scoped.filter((work) => work.district === inScope) : scoped;
  return { queue: topQueue(visible), geo: scopedDistrictGeo(scoped) };
}

/** Role lens over live API rows (ministry scope from the server login, filtered locally like the seed). */
export function scopeLiveRows(role: OfficerRole, rows: QueueWork[]): QueueWork[] {
  if (role === "district") {
    return rows.filter((work) => work.district === "Bhopal");
  }
  if (role === "state") {
    return rows.filter((work) => work.state === "Madhya Pradesh");
  }
  return rows;
}

/** Same derivation as getOverviewData, but over live API rows + flags. */
export function getOverviewDataFromLive(
  role: OfficerRole,
  selectedDistrict: string,
  rows: QueueWork[],
  flags: Anomaly[],
): { queue: QueueRow[]; geo: DistrictSlice[] } {
  const scoped = scopeLiveRows(role, rows);
  const inScope =
    selectedDistrict && scoped.some((work) => work.district === selectedDistrict) ? selectedDistrict : "";
  const visible = inScope ? scoped.filter((work) => work.district === inScope) : scoped;
  return { queue: topQueue(visible, flags), geo: scopedDistrictGeo(scoped, flags) };
}
