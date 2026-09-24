import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatMoneyRs, works } from "@/lib/mplads-mock";

const sanctioned = works.reduce((total, w) => total + w.sanctionedRs, 0);
const spent = works.reduce((total, w) => total + w.expenditureRs, 0);
const balance = sanctioned - spent;

const splits = [
  { label: `Sanctioned · 100%`, value: formatMoneyRs(sanctioned), bar: "bg-chart-3" },
  {
    label: `Released · ${((spent / sanctioned) * 100).toFixed(1)}%`,
    value: formatMoneyRs(spent),
    bar: "bg-chart-3/75",
  },
  {
    label: `Balance · ${((balance / sanctioned) * 100).toFixed(1)}%`,
    value: formatMoneyRs(balance),
    bar: "bg-chart-3/50",
  },
];

export function IncomeBreakdown() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal">Fund split</CardTitle>
      </CardHeader>

      <CardContent className="grid grid-cols-1 gap-1 md:grid-cols-3">
        {splits.map((split) => (
          <section key={split.label} className="isolate flex gap-[0.5px]">
            <Separator
              orientation="vertical"
              className="mb-1 h-auto self-auto border-muted-foreground/50 border-l border-dashed bg-transparent"
            />
            <div className="flex min-h-24 flex-1 flex-col justify-between">
              <div className="flex min-w-0 flex-col gap-1 px-1">
                <p className="wrap-break-word text-muted-foreground text-xs leading-none">{split.label}</p>
                <div className="font-heading text-lg tabular-nums leading-none tracking-tight">{split.value}</div>
              </div>
              <div className={`-ml-0.5 h-5 rounded-sm ${split.bar}`} />
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
