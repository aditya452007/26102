/**
 * Shared district-boundaries GeoJSON (760 districts, properties: district, st_nm).
 * Source: udit-001/india-maps-data@2884453 (see india-districts.json header commit).
 * Both map components render from this single copy — do not duplicate the 4MB file.
 */
import indiaDistricts from "./india-districts.json";
import indiaStates from "./india-states.json";

import type { Anomaly, Work } from "@/lib/mplads-schema";

export interface DistrictFeatureProps {
  district?: string;
  st_nm?: string;
}

export type DistrictsGeoJson = {
  type: "FeatureCollection";
  features: { type: "Feature"; properties: DistrictFeatureProps; geometry: GeoJSON.Geometry }[];
};

export const INDIA_DISTRICTS_GEO = indiaDistricts as unknown as DistrictsGeoJson;

export interface StateFeatureProps {
  name?: string;
}

export type StatesGeoJson = {
  type: "FeatureCollection";
  features: { type: "Feature"; properties: StateFeatureProps; geometry: GeoJSON.Geometry }[];
};

/** State outlines — rendered as a transparent overlay atop the district fills for readability. */
export const INDIA_STATES_GEO = indiaStates as unknown as StatesGeoJson;

/** Stable join key — a few UTs (Lakshadweep, Chandigarh) have duplicate district names across features. */
export function districtKey(props: DistrictFeatureProps): string {
  return `${props.st_nm ?? ""}|${props.district ?? ""}`;
}

export interface DistrictRisk {
  works: number;
  high: number;
}

/** Per-district risk aggregates (works count + high-flag count), keyed by district name. */
export function buildDistrictRiskIndex(works: Work[], anomalies: Anomaly[]): Map<string, DistrictRisk> {
  const highByWork = new Set(anomalies.filter((anomaly) => anomaly.severity === "high").map((anomaly) => anomaly.workId));
  const index = new Map<string, DistrictRisk>();
  for (const work of works) {
    const entry = index.get(work.district) ?? { works: 0, high: 0 };
    entry.works += 1;
    if (highByWork.has(work.id)) {
      entry.high += 1;
    }
    index.set(work.district, entry);
  }
  return index;
}

/** Shared choropleth palette: red scale for high-flag districts, blue scale for plain work volume. */
export function mapColorFor(high: number, works: number): string {
  if (high >= 3) {
    return "var(--destructive)";
  }
  if (high === 2) {
    return "color-mix(in oklch, var(--destructive) 70%, transparent)";
  }
  if (high === 1) {
    return "color-mix(in oklch, var(--destructive) 45%, transparent)";
  }
  if (works >= 8) {
    return "color-mix(in oklch, var(--primary) 75%, transparent)";
  }
  if (works >= 4) {
    return "color-mix(in oklch, var(--primary) 55%, transparent)";
  }
  if (works > 0) {
    return "color-mix(in oklch, var(--primary) 35%, transparent)";
  }
  return "var(--muted)";
}
