import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { getOverviewBundle } from "@/server/mplads/overview";
import { useRoleStore } from "@/stores/role/role-store";

import { getOverviewData, getOverviewDataFromLive } from "./-components/data";
import { IndiaRiskMap } from "./-components/india-risk-map";
import { KpiStrip } from "./-components/kpi-strip";
import { PriorityQueue } from "./-components/priority-queue";

export const Route = createFileRoute("/(main)/dashboard/overview")({
  validateSearch: (search: Record<string, unknown>): { district?: string } => ({
    district: typeof search.district === "string" ? search.district : undefined,
  }),
  // Backend-first, seed-fallback: the server fn returns { ok: false } when the
  // API is down, and the page renders seed data instantly — never a loader error.
  loader: async () => getOverviewBundle(),
  component: Page,
});

function Page() {
  const { district } = Route.useSearch();
  const bundle = Route.useLoaderData();
  const navigate = useNavigate();
  const role = useRoleStore((store) => store.role);
  const selectedDistrict = district ?? "";
  const seed = getOverviewData(role, selectedDistrict);
  const live = bundle.ok ? getOverviewDataFromLive(role, selectedDistrict, bundle.rows, bundle.anomalies) : null;
  const { queue, geo } = live ?? seed;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <KpiStrip kpis={bundle.ok ? bundle.kpis : undefined} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <IndiaRiskMap
            data={geo}
            selected={selectedDistrict}
            onSelect={(next) => {
              void navigate({
                from: Route.fullPath,
                search: (previous) => ({ ...previous, district: next }),
                replace: true,
                resetScroll: false,
              });
            }}
          />
        </div>
        <div className="xl:col-span-5">
          <PriorityQueue rows={queue} />
        </div>
      </div>
    </div>
  );
}
