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
import {
  buildDistrictRiskIndex,
  districtKey,
  INDIA_DISTRICTS_GEO,
  INDIA_STATES_GEO,
  mapColorFor,
} from "@/data/india-geo";
import type { Work } from "@/lib/mplads-schema";
import { anomalies, works } from "@/lib/mplads-mock";

const MAP_CENTER = createCoordinates(82.8, 22.75);
const MAP_SCALE = 648.81;

const DISTRICT_RISK = buildDistrictRiskIndex(works, anomalies);

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
              <Geographies geography={INDIA_DISTRICTS_GEO}>
                {({ geographies }) =>
                  geographies.map((geo, index) => {
                    const props = (geo.properties ?? {}) as { district?: string; st_nm?: string };
                    const key = districtKey(props);
                    const isHome = props.district === work.district && props.st_nm === work.state;
                    const risk = DISTRICT_RISK.get(props.district ?? "");
                    const fill = mapColorFor(risk?.high ?? 0, risk?.works ?? 0);
                    return (
                      <Geography
                        key={`${key}-${index}`}
                        geography={geo}
                        style={{
                          default: { fill, outline: "none" },
                          hover: {
                            fill: `color-mix(in oklch, ${fill} 85%, var(--foreground))`,
                            outline: "none",
                          },
                          pressed: { outline: "none" },
                        }}
                        stroke={isHome ? "var(--primary)" : "var(--border)"}
                        strokeWidth={isHome ? 1.4 : 0.25}
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
