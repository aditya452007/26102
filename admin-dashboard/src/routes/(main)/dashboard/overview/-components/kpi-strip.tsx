import { AlertTriangle, Banknote, Clock3, LayoutDashboard, Loader, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoneyRs, MPLADS_KPIS } from "@/lib/mplads-mock";

const POSITIVE_BADGE =
  "border-green-200 bg-green-500/10 text-green-700 dark:border-green-900/40 dark:bg-green-500/15 dark:text-green-300";
const NEGATIVE_BADGE = "border-destructive/20 bg-destructive/10 text-destructive";

export interface KpiValues {
  totalWorks: number;
  underExecution: number;
  delayed: number;
  highRisk: number;
  overrunExposureRs: number;
}

function buildKpiCards(kpis: KpiValues) {
  return [
  {
    icon: LayoutDashboard,
    title: "Total Works",
    value: kpis.totalWorks.toLocaleString("en-IN"),
    badge: (
      <Badge variant="outline" className={POSITIVE_BADGE}>
        <TrendingUp className="size-3" />
        +2.1%
      </Badge>
    ),
    caption: "Scheme snapshot, all states",
  },
  {
    icon: Loader,
    title: "Under Execution",
    value: kpis.underExecution.toLocaleString("en-IN"),
    badge: (
      <Badge variant="outline" className={POSITIVE_BADGE}>
        +3.4%
      </Badge>
    ),
    caption: "Active works in demo scope",
  },
  {
    icon: Clock3,
    title: "Delayed",
    value: kpis.delayed.toLocaleString("en-IN"),
    badge: (
      <Badge variant="outline" className={NEGATIVE_BADGE}>
        <TrendingDown className="size-3" />
        -8.2%
      </Badge>
    ),
    caption: "Past due date",
  },
  {
    icon: AlertTriangle,
    title: "High Risk",
    value: kpis.highRisk.toLocaleString("en-IN"),
    badge: (
      <Badge variant="outline" className={NEGATIVE_BADGE}>
        9 new
      </Badge>
    ),
    caption: "Needs review now",
  },
  {
    icon: Banknote,
    title: "Overrun exposure",
    value: formatMoneyRs(kpis.overrunExposureRs),
    badge: (
      <Badge variant="outline" className={NEGATIVE_BADGE}>
        +{formatMoneyRs(6200000)}
      </Badge>
    ),
    caption: "Above peer estimates",
  },
];
}

export function KpiStrip({ kpis = MPLADS_KPIS }: { readonly kpis?: KpiValues }) {
  const cards = buildKpiCards(kpis);
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs md:grid-cols-3 xl:grid-cols-5 dark:*:data-[slot=card]:bg-card">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <card.icon className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>{card.title}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{card.value}</div>
              {card.badge}
            </div>
            <p className="text-muted-foreground text-sm">{card.caption}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
