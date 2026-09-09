import { differenceInCalendarDays, format, subDays } from "date-fns";

import { formatCurrency } from "@/lib/utils";

import type { Activity, Anomaly, AnomalyKind, Evidence, Severity, Work, WorkStatus, WorkType } from "./mplads-schema";

export const MPLADS_SEED = 26102;

export const MPLADS_STORAGE_KEY = "mplads-demo-v1";

export const DEMO_TODAY_ISO = "2026-09-07";

export const FLAGSHIP_WORK_ID = "W-1014";

export const MPLADS_KPIS = {
  totalWorks: 12482,
  underExecution: 4821,
  delayed: 386,
  highRisk: 73,
  overrunExposureLakh: 41,
} as const;

const DEMO_TODAY = new Date(2026, 8, 7);

const WORK_TYPES: WorkType[] = ["road", "community-hall", "water", "school", "drainage", "streetlight"];

interface DistrictSeed {
  state: string;
  district: string;
  lat: number;
  lon: number;
}

const DISTRICTS: DistrictSeed[] = [
  { state: "Madhya Pradesh", district: "Bhopal", lat: 23.26, lon: 77.41 },
  { state: "Madhya Pradesh", district: "Indore", lat: 22.72, lon: 75.86 },
  { state: "Rajasthan", district: "Jaipur", lat: 26.91, lon: 75.79 },
  { state: "Rajasthan", district: "Udaipur", lat: 24.58, lon: 73.68 },
  { state: "Bihar", district: "Patna", lat: 25.59, lon: 85.14 },
  { state: "Bihar", district: "Gaya", lat: 24.79, lon: 85.0 },
  { state: "Odisha", district: "Cuttack", lat: 20.46, lon: 85.88 },
  { state: "Odisha", district: "Sambalpur", lat: 21.47, lon: 83.97 },
  { state: "Karnataka", district: "Bengaluru Urban", lat: 12.97, lon: 77.59 },
  { state: "Karnataka", district: "Mysuru", lat: 12.3, lon: 76.65 },
  { state: "Assam", district: "Kamrup", lat: 26.18, lon: 91.75 },
  { state: "Assam", district: "Dibrugarh", lat: 27.47, lon: 94.91 },
];

const DEPARTMENTS = ["PWD", "Water Board", "Municipal Corp", "Rural Works"] as const;

const FLAG_PLAN: { kind: AnomalyKind; severity: Severity }[] = [
  { kind: "cost", severity: "high" },
  { kind: "cost", severity: "high" },
  { kind: "duplicate", severity: "high" },
  { kind: "delay", severity: "high" },
  { kind: "expenditure", severity: "high" },
  { kind: "delay", severity: "medium" },
  { kind: "delay", severity: "medium" },
  { kind: "utilisation", severity: "medium" },
  { kind: "cost", severity: "medium" },
  { kind: "expenditure", severity: "low" },
  { kind: "delay", severity: "low" },
  { kind: "utilisation", severity: "low" },
];

export interface GeoRollup {
  state: string;
  works: number;
  high: number;
  delayed: number;
  stalled: number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function int(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function parseDay(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dayString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatLakh(lakh: number): string {
  return `₹${lakh.toFixed(1)}L`;
}

export function formatINR(lakh: number): string {
  return formatCurrency(lakh * 100000, { currency: "INR", locale: "en-IN", noDecimals: true });
}

export function formatWorkDate(yyyyMmDd: string): string {
  return format(parseDay(yyyyMmDd), "d MMM yyyy");
}

export function stallLabel(lastUpdate: string): string {
  return `${differenceInCalendarDays(DEMO_TODAY, parseDay(lastUpdate))}d ago`;
}

export function compareSentence(
  actualLakh: number,
  peerMedianLakh: number,
  peerN: number,
  type: WorkType,
  district: string,
): string {
  return `${formatLakh(actualLakh)} vs ${formatLakh(peerMedianLakh)} median across ${peerN} similar ${type} works in ${district}`;
}

function titleFor(type: WorkType, n: number): string {
  switch (type) {
    case "road":
      return `BT Road Renewal — Rural Stretch ${n}`;
    case "community-hall":
      return `Community Hall — Ward Block ${n}`;
    case "water":
      return `Piped Water Extension — Zone ${n}`;
    case "school":
      return `School Classroom Block — Phase ${n}`;
    case "drainage":
      return `Storm Drain — Sector ${n}`;
    case "streetlight":
      return `Streetlight Cluster — Phase ${n}`;
  }
}

function agencyFor(rng: () => number): string {
  return rng() < 0.5 ? `Contractor-${String(int(rng, 1, 12)).padStart(2, "0")}` : `Agency-East-${int(rng, 1, 4)}`;
}

function progressFor(rng: () => number, status: WorkStatus): number {
  if (status === "completed") {
    return 100;
  }
  if (status === "sanctioned") {
    return int(rng, 0, 5);
  }
  if (status === "in-execution") {
    return int(rng, 15, 85);
  }
  return int(rng, 10, 70);
}

function spendRatioFor(rng: () => number, status: WorkStatus): number {
  if (status === "completed") {
    return 0.95 + rng() * 0.05;
  }
  if (status === "sanctioned") {
    return rng() * 0.1;
  }
  return 0.2 + rng() * 0.65;
}

function lastUpdateFor(rng: () => number, status: WorkStatus): string {
  if (status === "stalled") {
    return dayString(subDays(DEMO_TODAY, int(rng, 91, 180)));
  }
  if (status === "in-execution") {
    return dayString(subDays(DEMO_TODAY, int(rng, 2, 30)));
  }
  return dayString(subDays(DEMO_TODAY, int(rng, 5, 120)));
}

function shuffled<T>(rng: () => number, items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildWorks(): Work[] {
  const rng = mulberry32(MPLADS_SEED);
  const extraRng = mulberry32(MPLADS_SEED + 500);
  const ids: string[] = [];
  for (let n = 1001; n <= 1040; n += 1) {
    ids.push(`W-${n}`);
  }

  const restStatuses: WorkStatus[] = shuffled(rng, [
    ...Array<WorkStatus>(18).fill("in-execution"),
    ...Array<WorkStatus>(7).fill("stalled"),
    ...Array<WorkStatus>(7).fill("completed"),
    ...Array<WorkStatus>(7).fill("sanctioned"),
  ]);

  const sanctionBase = new Date(2023, 3, 1);
  const works: Work[] = [];
  let statusCursor = 0;

  ids.forEach((id, index) => {
    const place = DISTRICTS[index % DISTRICTS.length];
    const isFlagship = id === FLAGSHIP_WORK_ID;
    const type = isFlagship ? "community-hall" : WORK_TYPES[int(rng, 0, WORK_TYPES.length - 1)];
    const status: WorkStatus = isFlagship ? "stalled" : restStatuses[statusCursor++];
    const title = isFlagship ? "Community Hall — Ward Block 7" : titleFor(type, int(rng, 1, 24));
    const agency = isFlagship ? "Contractor-07" : agencyFor(rng);

    const sanctionedLakh = isFlagship ? 58.9 : oneDecimal(4 + rng() * 86);
    const progressPct = isFlagship ? 62 : progressFor(rng, status);
    const expenditureLakh = isFlagship ? 41.2 : oneDecimal(sanctionedLakh * spendRatioFor(rng, status));

    const sanctionDate = isFlagship
      ? "2024-11-20"
      : dayString(new Date(sanctionBase.getTime() + int(rng, 0, 820) * 86400000));
    const dueDate = isFlagship
      ? "2025-10-15"
      : dayString(new Date(parseDay(sanctionDate).getTime() + (270 + int(rng, 0, 270)) * 86400000));
    const lastUpdate = isFlagship ? dayString(subDays(DEMO_TODAY, 96)) : lastUpdateFor(rng, status);
    const district = isFlagship ? "Bhopal" : place.district;

    const tenderHolder = isFlagship ? "Contractor-07" : agency;
    const tenderAwardedBy = `District Authority, ${district}`;
    const department = isFlagship ? "PWD" : DEPARTMENTS[int(extraRng, 0, DEPARTMENTS.length - 1)];
    const labourDeployed = isFlagship ? 42 : int(extraRng, 8, 60);
    const demandedDays = isFlagship ? 330 : int(extraRng, 180, 540);
    let returnedLakh = 0;
    if (!isFlagship && extraRng() >= 0.7) {
      const headroom = Math.max(sanctionedLakh - expenditureLakh, 0);
      returnedLakh = oneDecimal(Math.min(extraRng() * Math.min(5, sanctionedLakh * 0.15), headroom));
    }

    works.push({
      id,
      title,
      type,
      state: place.state,
      district,
      agency,
      status,
      sanctionedLakh,
      expenditureLakh,
      progressPct,
      sanctionDate,
      dueDate,
      lastUpdate,
      lat: oneDecimal((isFlagship ? 23.26 : place.lat) + (rng() - 0.5) * 0.2),
      lon: oneDecimal((isFlagship ? 77.41 : place.lon) + (rng() - 0.5) * 0.2),
      tenderHolder,
      tenderAwardedBy,
      department,
      labourDeployed,
      demandedDays,
      returnedLakh,
    });
  });

  return works;
}

function buildAnomaly(work: Work, kind: AnomalyKind, severity: Severity, index: number, works: Work[]): Anomaly {
  const rng = mulberry32(MPLADS_SEED + index * 101);
  const isFlagship = work.id === FLAGSHIP_WORK_ID;
  const peerN = isFlagship ? 18 : int(rng, 8, 18);
  const id = `A-${index + 1}`;

  if (kind === "delay") {
    const days = differenceInCalendarDays(DEMO_TODAY, parseDay(work.lastUpdate));
    return {
      id,
      workId: work.id,
      kind,
      severity,
      headline: `No progress update in ${days}d — needs review`,
      peerN,
      peerMedianLakh: null,
      actualLakh: null,
      unit: "₹L",
      corroboration: `Last field update was ${stallLabel(work.lastUpdate)} against a ${formatWorkDate(work.dueDate)} due date.`,
      signals: [
        { label: "Stall duration", value: `${days}d without update (review threshold 90d)` },
        { label: "Due date", value: `${formatWorkDate(work.dueDate)} at ${work.progressPct}% progress` },
      ],
    };
  }

  if (kind === "duplicate") {
    const twin = works.find((w) => w.id !== work.id && w.district === work.district && w.type === work.type);
    return {
      id,
      workId: work.id,
      kind,
      severity,
      headline: `Possible overlapping scope with a nearby ${work.type} work — needs review`,
      peerN,
      peerMedianLakh: null,
      actualLakh: work.sanctionedLakh,
      unit: "₹L",
      corroboration: twin
        ? `Same type and district as ${twin.id} (${twin.title}); site extents need a joint review.`
        : "Same type and district as another sanctioned work; site extents need a joint review.",
      signals: [
        {
          label: "Near-duplicate",
          value: twin
            ? `${twin.id} — ${twin.title} in ${twin.district}`
            : "Matched on type + district + sanction window",
        },
        { label: "Sanctioned cost", value: formatLakh(work.sanctionedLakh) },
      ],
    };
  }

  if (kind === "expenditure") {
    const ratio = severity === "high" ? 1.6 + rng() * 0.6 : 1.2 + rng() * 0.2;
    const peerMedianLakh = oneDecimal(work.expenditureLakh / ratio);
    return {
      id,
      workId: work.id,
      kind,
      severity,
      headline: `Front-loaded spending pattern — needs review`,
      peerN,
      peerMedianLakh,
      actualLakh: work.expenditureLakh,
      unit: "₹L",
      corroboration: `Released ${formatLakh(work.expenditureLakh)} against ${work.progressPct}% physical progress.`,
      signals: [
        {
          label: "Peer comparison",
          value: compareSentence(work.expenditureLakh, peerMedianLakh, peerN, work.type, work.district),
        },
        {
          label: "Progress vs spend",
          value: `${work.progressPct}% progress at ${formatLakh(work.expenditureLakh)} released`,
        },
      ],
    };
  }

  if (kind === "utilisation") {
    const peerMedianLakh = oneDecimal(work.sanctionedLakh * (0.55 + rng() * 0.2));
    return {
      id,
      workId: work.id,
      kind,
      severity,
      headline: `Low fund utilisation with utilisation certificate pending — needs review`,
      peerN,
      peerMedianLakh,
      actualLakh: work.expenditureLakh,
      unit: "₹L",
      corroboration: "Utilisation certificate for the last released tranche is still awaited from the agency.",
      signals: [
        {
          label: "Peer comparison",
          value: compareSentence(work.expenditureLakh, peerMedianLakh, peerN, work.type, work.district),
        },
        { label: "Certificate status", value: "UC pending for last tranche" },
      ],
    };
  }

  let ratio: number;
  if (isFlagship) {
    ratio = 58.9 / 24.6;
  } else if (severity === "high") {
    ratio = 2.0 + rng() * 0.6;
  } else {
    ratio = 1.4 + rng() * 0.5;
  }
  const peerMedianLakh = isFlagship ? 24.6 : oneDecimal(work.sanctionedLakh / ratio);
  const headline = isFlagship
    ? "Sanctioned cost 2.4× peer median with a 96d stall — needs review"
    : `Sanctioned cost above peer median — needs review`;
  return {
    id,
    workId: work.id,
    kind,
    severity,
    headline,
    peerN,
    peerMedianLakh,
    actualLakh: work.sanctionedLakh,
    unit: "₹L",
    corroboration: isFlagship
      ? "Single-estimate sanction plus a 96-day stall corroborates the cost variance."
      : "Single-estimate sanction with limited comparative quotes corroborates the variance.",
    signals: [
      {
        label: "Peer comparison",
        value: compareSentence(work.sanctionedLakh, peerMedianLakh, peerN, work.type, work.district),
      },
      isFlagship
        ? { label: "Corroborating signal", value: `96d stall — last update ${stallLabel(work.lastUpdate)}` }
        : { label: "Corroborating signal", value: "Estimate variance beyond peer band" },
    ],
  };
}

function buildAnomalies(works: Work[]): Anomaly[] {
  const rng = mulberry32(MPLADS_SEED + 7);
  const flagship = works.find((w) => w.id === FLAGSHIP_WORK_ID);
  const candidates = shuffled(
    rng,
    works.filter((w) => w.id !== FLAGSHIP_WORK_ID && (w.status === "in-execution" || w.status === "stalled")),
  );
  const flagged: Work[] = flagship ? [flagship, ...candidates.slice(0, FLAG_PLAN.length - 1)] : [];
  return flagged.map((work, index) =>
    buildAnomaly(work, FLAG_PLAN[index].kind, FLAG_PLAN[index].severity, index, works),
  );
}

function buildEvidences(anomalies: Anomaly[]): Evidence[] {
  const rng = mulberry32(MPLADS_SEED + 21);
  const kinds = [
    { kind: "photo", name: "Site photo — foundation stage" },
    { kind: "report", name: "Measurement sheet MB-3" },
    { kind: "doc", name: "Completion certificate (draft)" },
    { kind: "photo", name: "Geo-tagged photo — slab stage" },
    { kind: "doc", name: "Utilisation certificate UC-2" },
    { kind: "report", name: "Estimate comparative sheet" },
  ] as const;
  return kinds.map((file, index) => ({
    id: `E-${index + 1}`,
    workId: anomalies[index % anomalies.length].workId,
    kind: file.kind,
    name: file.name,
    sizeKb: int(rng, 180, 4200),
    uploadedAt: `${dayString(subDays(DEMO_TODAY, int(rng, 1, 40)))}T10:00:00.000Z`,
    by: index % 2 === 0 ? "Field Engineer (demo)" : "District Office (demo)",
  }));
}

function buildActivities(anomalies: Anomaly[]): Activity[] {
  const activities: Activity[] = [];
  let counter = 1;
  anomalies.forEach((anomaly, index) => {
    let noteCount = 0;
    if (index === 0) {
      noteCount = 2;
    } else if (index < 8) {
      noteCount = 1;
    }
    activities.push({
      id: `T-${counter++}`,
      workId: anomaly.workId,
      at: `${dayString(subDays(DEMO_TODAY, 2))}T09:00:00.000Z`,
      actor: "NIRIKSHAN engine (demo)",
      action: "Flag raised — needs review",
      note: anomaly.headline,
    });
    activities.push({
      id: `T-${counter++}`,
      workId: anomaly.workId,
      at: `${dayString(subDays(DEMO_TODAY, 1))}T11:30:00.000Z`,
      actor: "District Office (demo)",
      action: "Evidence linked for review",
    });
    if (noteCount >= 1) {
      activities.push({
        id: `T-${counter++}`,
        workId: anomaly.workId,
        at: `${dayString(DEMO_TODAY)}T08:15:00.000Z`,
        actor: "District Officer (demo)",
        action: "Review note recorded",
        note: "Field verification scheduled — needs review before next release.",
      });
    }
    if (noteCount === 2) {
      activities.push({
        id: `T-${counter++}`,
        workId: anomaly.workId,
        at: `${dayString(DEMO_TODAY)}T09:45:00.000Z`,
        actor: "District Officer (demo)",
        action: "Queued for state nodal review (demo)",
      });
    }
  });
  return activities;
}

function buildGeoRollup(works: Work[], anomalies: Anomaly[]): GeoRollup[] {
  const highByWork = new Map(anomalies.filter((a) => a.severity === "high").map((a) => [a.workId, true]));
  const byState = new Map<string, GeoRollup>();
  for (const work of works) {
    const entry = byState.get(work.state) ?? { state: work.state, works: 0, high: 0, delayed: 0, stalled: 0 };
    entry.works += 1;
    if (highByWork.has(work.id)) {
      entry.high += 1;
    }
    if (work.status === "stalled") {
      entry.stalled += 1;
      entry.delayed += 1;
    } else if (work.status === "in-execution" && work.dueDate < DEMO_TODAY_ISO) {
      entry.delayed += 1;
    }
    byState.set(work.state, entry);
  }
  return [...byState.values()].sort((a, b) => a.state.localeCompare(b.state));
}

export const works: Work[] = buildWorks();

export const anomalies: Anomaly[] = buildAnomalies(works);

export const evidences: Evidence[] = buildEvidences(anomalies);

export const activities: Activity[] = buildActivities(anomalies);

export const geoRollup: GeoRollup[] = buildGeoRollup(works, anomalies);
