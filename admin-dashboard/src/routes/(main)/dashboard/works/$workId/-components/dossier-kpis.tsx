import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoneyRs } from "@/lib/mplads-mock";
import type { Work } from "@/lib/mplads-schema";

interface DossierKpisProps {
  work: Work;
  stallDays: number;
  utilisationPct: number;
  flagCount: number;
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="gap-5 overflow-hidden rounded-none border-0 border-foreground/10 border-b ring-0 sm:border-r xl:col-span-2 xl:border-b-0 [&:last-child]:border-r-0">
      <CardHeader>
        <CardTitle className="font-normal">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-heading text-3xl tabular-nums leading-none tracking-tight">{value}</div>
        <p className="mt-1 text-muted-foreground text-xs">{sub}</p>
      </CardContent>
    </Card>
  );
}

export function DossierKpis({ work, stallDays, utilisationPct, flagCount }: DossierKpisProps) {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12">
        <Kpi label="Sanctioned" value={formatMoneyRs(work.sanctionedRs)} sub={`#${work.id} sanction`} />
        <Kpi label="Spent" value={formatMoneyRs(work.expenditureRs)} sub={`${utilisationPct.toFixed(0)}% utilisation`} />
        <Kpi label="Progress" value={`${work.progressPct}%`} sub={work.status.replace("-", " ")} />
        <Kpi
          label="Stalled"
          value={`${stallDays}d`}
          sub={stallDays >= 90 ? "past 90d review threshold" : "within review threshold"}
        />
        <Kpi label="Open flags" value={`${flagCount}`} sub={flagCount === 0 ? "nothing to review" : "needs review"} />
        <Kpi label="Labour" value={`${work.labourDeployed}`} sub={`${work.department} on site`} />
      </div>
    </div>
  );
}
