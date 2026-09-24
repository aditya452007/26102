import { Ellipsis } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MPLADS_KPIS, works } from "@/lib/mplads-mock";

const spent = works.reduce((total, w) => total + w.expenditureRs, 0);
const sanctioned = works.reduce((total, w) => total + w.sanctionedRs, 0);
const sampleUtilisation = (spent / sanctioned) * 100;

const kpis = [
  {
    title: "Total works",
    value: MPLADS_KPIS.totalWorks.toLocaleString("en-IN"),
    from: "scheme-wide (demo)",
    badge: "Scheme",
  },
  {
    title: "Under execution",
    value: MPLADS_KPIS.underExecution.toLocaleString("en-IN"),
    from: "scheme-wide (demo)",
    badge: "Scheme",
  },
  {
    title: "Delayed",
    value: MPLADS_KPIS.delayed.toLocaleString("en-IN"),
    from: "scheme-wide (demo)",
    badge: "Scheme",
  },
  {
    title: "High-risk",
    value: MPLADS_KPIS.highRisk.toLocaleString("en-IN"),
    from: "scheme-wide (demo)",
    badge: "Scheme",
  },
  {
    title: "Sample utilisation",
    value: `${sampleUtilisation.toFixed(1)}%`,
    from: `${works.length} sampled works`,
    badge: "Sample",
  },
];

export function AnalyticsKpiStrip() {
  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-foreground/10">
      <div className="grid divide-y *:data-[slot=card]:rounded-none *:data-[slot=card]:ring-0 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader>
              <CardTitle className="font-normal text-sm">{kpi.title}</CardTitle>
              <CardAction>
                <Ellipsis className="size-4" />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-2xl tabular-nums leading-none tracking-tight">{kpi.value}</div>
                <Badge variant="outline">{kpi.badge}</Badge>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <span>
                  from <span className="text-foreground">{kpi.from}</span>
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
