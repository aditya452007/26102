import { useState } from "react";

import {
  ComposableMap,
  createCoordinates,
  Geographies,
  Geography,
  Sphere,
  ZoomableGroup,
} from "@vnedyalk0v/react19-simple-maps";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { StateSlice } from "./data";
import indiaStates from "./india-states.json";

type StatesGeoJson = {
  type: "FeatureCollection";
  features: { type: "Feature"; properties: { name?: string }; geometry: GeoJSON.Geometry }[];
};

const INDIA_GEO = indiaStates as unknown as StatesGeoJson;
const MAP_CENTER = createCoordinates(82.8, 22.75);
const MAP_SCALE = 648.81;

function fillFor(high: number, works: number): string {
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

interface HoverTip {
  text: string;
  x: number;
  y: number;
}

interface IndiaRiskMapProps {
  data: StateSlice[];
  selected: string;
  onSelect: (state: string) => void;
}

export function IndiaRiskMap({ data, selected, onSelect }: IndiaRiskMapProps) {
  const [hover, setHover] = useState<HoverTip | null>(null);
  const byState = new Map(data.map((entry) => [entry.state, entry]));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Risk geography</CardTitle>
        <CardDescription>High-flag concentration by state — drag to pan, scroll to zoom</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-80 overflow-hidden lg:h-[420px]">
          <ComposableMap
            aria-label="India risk map by state"
            className="block size-full"
            width={1000}
            height={520}
            projection="geoMercator"
            projectionConfig={{ center: MAP_CENTER, scale: MAP_SCALE }}
          >
            <Sphere className="fill-[#d4dadc] dark:fill-[#2C353C]" />
            <ZoomableGroup center={MAP_CENTER} zoom={1} minZoom={1} maxZoom={4}>
              <Geographies geography={INDIA_GEO}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const name = (geo.properties as { name?: string } | null)?.name ?? "Unknown";
                    const counts = byState.get(name);
                    const isSelected = selected === name;
                    return (
                      <Geography
                        key={name}
                        geography={geo}
                        onClick={() => onSelect(isSelected ? "" : name)}
                        onMouseEnter={(event) => {
                          setHover({
                            text: counts
                              ? `${name} · ${counts.works} works · ${counts.high} high-risk`
                              : `${name} · no demo works`,
                            x: event.clientX,
                            y: event.clientY,
                          });
                        }}
                        onMouseLeave={() => setHover(null)}
                        style={{
                          default: {                             fill: fillFor(counts?.high ?? 0, counts?.works ?? 0), outline: "none" },
                          hover: { fill: "color-mix(in oklch, var(--primary) 25%, transparent)", outline: "none" },
                          pressed: { outline: "none" },
                        }}
                        stroke={isSelected ? "var(--primary)" : "var(--border)"}
                        strokeWidth={isSelected ? 1.5 : 0.5}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
          {hover && (
            <div
              className="pointer-events-none fixed z-50 rounded-md bg-foreground px-3 py-1.5 text-background text-xs"
              style={{ left: hover.x + 12, top: hover.y + 12 }}
            >
              {hover.text}
            </div>
          )}
          <div className="absolute bottom-2 left-2 flex items-center gap-3 rounded-md border bg-card/90 px-2.5 py-1.5 text-muted-foreground text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border bg-muted" />
              No works
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border bg-primary/35" />
              Few works
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border bg-primary/75" />
              Many works
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border bg-destructive/45" />1 high flag
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border bg-destructive/70" />2 high flags
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border bg-destructive" />
              3+ high flags
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
