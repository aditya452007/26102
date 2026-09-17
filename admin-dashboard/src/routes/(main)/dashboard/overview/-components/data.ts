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
  work: Work;
  anomaly: Anomaly;
  reason: string;
}

function reasonFor(work: Work, anomaly: Anomaly): string {
  if (anomaly.actualLakh !== null && anomaly.peerMedianLakh !== null) {
    return compareSentence(anomaly.actualLakh, anomaly.peerMedianLakh, anomaly.peerN, work.type, work.district);
  }
  return anomaly.headline;
}

function amountOf(work: Work, anomaly: Anomaly): number {
  return anomaly.actualLakh ?? work.sanctionedLakh;
}

export function topQueue(scoped: Work[]): QueueRow[] {
  const byId = new Map(scoped.map((work) => [work.id, work]));
  return anomalies
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

export function scopedDistrictGeo(scoped: Work[]): DistrictSlice[] {
  const highByWork = new Set(anomalies.filter((a) => a.severity === "high").map((a) => a.workId));
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
