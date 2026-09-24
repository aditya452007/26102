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

import { districtKey, districtLabel, INDIA_DISTRICTS_GEO, INDIA_STATES_GEO, mapColorFor } from "@/data/india-geo";

import type { DistrictSlice, StateSlice } from "./data";
const MAP_CENTER = createCoordinates(82.8, 22.75);
const MAP_SCALE = 648.81;

interface HoverTip {
  text: string;
  x: number;
  y: number;
}

interface IndiaRiskMapProps {
  data: DistrictSlice[];
  states: StateSlice[];
  selected: string;
  onSelect: (district: string) => void;
}

export function IndiaRiskMap({ data, states, selected, onSelect }: IndiaRiskMapProps) {
  const [hover, setHover] = useState<HoverTip | null>(null);
  const byDistrict = new Map(data.map((entry) => [entry.district, entry]));
  const byState = new Map(states.map((entry) => [entry.state, entry]));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Risk geography</CardTitle>
        <CardDescription>High-flag concentration by district — drag to pan, scroll to zoom</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-80 overflow-hidden lg:h-[420px]">
          <ComposableMap
            aria-label="India risk map by district"
            className="block size-full"
            width={1000}
            height={520}
            projection="geoMercator"
            projectionConfig={{ center: MAP_CENTER, scale: MAP_SCALE }}
          >
            <Sphere className="fill-[#d4dadc] dark:fill-[#2C353C]" />
            <ZoomableGroup center={MAP_CENTER} zoom={1} minZoom={1} maxZoom={4}>
              <Geographies geography={INDIA_DISTRICTS_GEO}>
                {({ geographies }) =>
                  geographies.map((geo, index) => {
                    const props = (geo.properties ?? {}) as { district?: string; st_nm?: string };
                    const key = districtKey(props);
                    const hasDistrict = Boolean(props.district);
                    const name = props.district ?? "";
                    const label = districtLabel(props);
                    const counts = hasDistrict ? byDistrict.get(name) : undefined;
                    // District-less polygons are state remainders — show that state's works.
                    const stateCounts =
                      !hasDistrict && props.st_nm ? byState.get(props.st_nm) : undefined;
                    const isSelected = hasDistrict && selected === name;
                    return (
                      <Geography
                        key={`${key}-${index}`}
                        geography={geo}
                        onClick={() => {
                          if (hasDistrict) {
                            onSelect(isSelected ? "" : name);
                          }
                        }}
                        onMouseEnter={(event) => {
                          setHover({
                            text: counts
                              ? `${label} · ${counts.works} works · ${counts.high} high-risk`
                              : stateCounts
                                ? `${label} · ${stateCounts.works} works in state · ${stateCounts.high} high-risk`
                                : `${label} · no works in demo sample`,
                            x: event.clientX,
                            y: event.clientY,
                          });
                        }}
                        onMouseLeave={() => setHover(null)}
                        style={{
                          default: {
                            fill: mapColorFor(
                              counts?.high ?? stateCounts?.high ?? 0,
                              counts?.works ?? stateCounts?.works ?? 0,
                            ),
                            outline: "none",
                          },
                          hover: { fill: "color-mix(in oklch, var(--primary) 25%, transparent)", outline: "none" },
                          pressed: { outline: "none" },
                        }}
                        stroke={isSelected ? "var(--primary)" : "var(--border)"}
                        strokeWidth={isSelected ? 1.4 : 0.25}
                      />
                    );
                  })
                }
              </Geographies>
              <Geographies geography={INDIA_STATES_GEO}>
                {({ geographies }) =>
                  geographies.map((geo, index) => (
                    <Geography
                      key={`state-outline-${index}`}
                      geography={geo}
                      style={{
                        default: { fill: "transparent", outline: "none", pointerEvents: "none" },
                        hover: { fill: "transparent", outline: "none", pointerEvents: "none" },
                        pressed: { fill: "transparent", outline: "none", pointerEvents: "none" },
                      }}
                      stroke="var(--foreground)"
                      strokeOpacity={0.35}
                      strokeWidth={0.8}
                    />
                  ))
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
              No works in sample
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
