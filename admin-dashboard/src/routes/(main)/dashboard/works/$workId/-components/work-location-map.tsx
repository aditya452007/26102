import {
  ComposableMap,
  createCoordinates,
  createLatitude,
  createLongitude,
  Geographies,
  Geography,
  Marker,
  Sphere,
  ZoomableGroup,
} from "@vnedyalk0v/react19-simple-maps";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Work } from "@/lib/mplads-schema";

import indiaStates from "./india-states.json";

type StatesGeoJson = {
  type: "FeatureCollection";
  features: { type: "Feature"; properties: { name?: string }; geometry: GeoJSON.Geometry }[];
};

const INDIA_GEO = indiaStates as unknown as StatesGeoJson;
const MAP_CENTER = createCoordinates(82.8, 22.75);
const MAP_SCALE = 648.81;

interface WorkLocationMapProps {
  work: Work;
}

export function WorkLocationMap({ work }: WorkLocationMapProps) {
  return (
    <Card className="mt-3">
      <CardHeader>
        <CardTitle>Work location</CardTitle>
        <CardDescription>
          {work.district}, {work.state} · {work.lat.toFixed(2)}°N {work.lon.toFixed(2)}°E
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-64 overflow-hidden lg:h-80">
          <ComposableMap
            aria-label={`Map pin for ${work.id} in ${work.district}, ${work.state}`}
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
                    const isHome = name === work.state;
                    return (
                      <Geography
                        key={name}
                        geography={geo}
                        style={{
                          default: {
                            fill: isHome ? "color-mix(in oklch, var(--primary) 25%, transparent)" : "var(--muted)",
                            outline: "none",
                          },
                          hover: {
                            fill: isHome ? "color-mix(in oklch, var(--primary) 35%, transparent)" : "var(--muted)",
                            outline: "none",
                          },
                          pressed: { outline: "none" },
                        }}
                        stroke={isHome ? "var(--primary)" : "var(--border)"}
                        strokeWidth={isHome ? 1.5 : 0.5}
                      />
                    );
                  })
                }
              </Geographies>
              <Marker coordinates={[createLongitude(work.lon), createLatitude(work.lat)]}>
                <circle r={8} fill="var(--background)" stroke="var(--primary)" strokeWidth={3} />
                <circle r={3} fill="var(--primary)" />
                <text textAnchor="middle" y={-14} className="fill-foreground font-mono" style={{ fontSize: 12 }}>
                  {work.id}
                </text>
              </Marker>
            </ZoomableGroup>
          </ComposableMap>
        </div>
      </CardContent>
    </Card>
  );
}
