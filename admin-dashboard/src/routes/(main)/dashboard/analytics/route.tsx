import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AnalyticsKpiStrip } from "./-components/analytics-kpi-strip";
import { type AnalyticsRange, AnalyticsToolbar } from "./-components/analytics-toolbar";
import { RealtimeVisitors } from "./-components/realtime-visitors";
import { TopPages } from "./-components/top-pages";
import { TopTrafficSources } from "./-components/top-traffic-sources";
import { TrafficQuality } from "./-components/traffic-quality";

export const Route = createFileRoute("/(main)/dashboard/analytics")({
  component: Page,
});

function Page() {
  const [range, setRange] = useState<AnalyticsRange>("all");

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl tracking-tight">Scheme performance</h1>
        <p className="text-muted-foreground text-sm">
          Are delays and stalls growing? Where is risk? Demo sample of 144 works.
        </p>
      </div>

      <Tabs defaultValue="overview" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="audience">Delays</TabsTrigger>
            <TabsTrigger value="acquisition">Risk</TabsTrigger>
            <TabsTrigger value="engagement">Stalls</TabsTrigger>
            <TabsTrigger value="conversions">Funds</TabsTrigger>
          </TabsList>

          <AnalyticsToolbar range={range} onRangeChange={setRange} />
        </div>

        <TabsContent value="overview" className="flex flex-col gap-4">
          <AnalyticsKpiStrip />

          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <TrafficQuality range={range} />
            </div>
            <div className="xl:col-span-5">
              <RealtimeVisitors />
            </div>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <TopPages />
            </div>
            <div className="xl:col-span-5 xl:col-start-8">
              <TopTrafficSources />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="audience">
          <div className="flex h-64 items-center justify-center rounded-xl border border-border border-dashed text-muted-foreground">
            Delay deep-dive coming soon.
          </div>
        </TabsContent>

        <TabsContent value="acquisition">
          <div className="flex h-64 items-center justify-center rounded-xl border border-border border-dashed text-muted-foreground">
            Risk deep-dive coming soon.
          </div>
        </TabsContent>

        <TabsContent value="engagement">
          <div className="flex h-64 items-center justify-center rounded-xl border border-border border-dashed text-muted-foreground">
            Stall deep-dive coming soon.
          </div>
        </TabsContent>

        <TabsContent value="conversions">
          <div className="flex h-64 items-center justify-center rounded-xl border border-border border-dashed text-muted-foreground">
            Fund deep-dive coming soon.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
