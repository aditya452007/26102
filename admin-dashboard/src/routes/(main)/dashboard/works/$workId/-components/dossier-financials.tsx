import { CartesianGrid, Label, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatMoneyRs } from "@/lib/mplads-mock";
import type { Work } from "@/lib/mplads-schema";

import type { SpendPoint } from "./dossier-data";

interface DossierFinancialsProps {
  work: Work;
  series: SpendPoint[];
  peerLabel: string;
}

const chartConfig = {
  peer: {
    color: "var(--chart-2)",
    label: "Peer",
  },
  spent: {
    color: "var(--chart-4)",
    label: "Spent",
  },
} satisfies ChartConfig;

interface FundSlice {
  account: string;
  amount: number;
  key: string;
  percentage: number;
}

export function DossierFinancials({ work, series, peerLabel }: DossierFinancialsProps) {
  const utilisationPct = work.sanctionedRs > 0 ? (work.expenditureRs / work.sanctionedRs) * 100 : 0;
  const returnedRs = work.returnedRs;
  const balanceRs = Math.max(work.sanctionedRs - work.expenditureRs - returnedRs, 0);
  const slices: FundSlice[] = [
    { account: "Spent", amount: work.expenditureRs, key: "spent", percentage: utilisationPct },
    {
      account: "Returned",
      amount: returnedRs,
      key: "returned",
      percentage: work.sanctionedRs > 0 ? (returnedRs / work.sanctionedRs) * 100 : 0,
    },
    {
      account: "Balance",
      amount: balanceRs,
      key: "balance",
      percentage: work.sanctionedRs > 0 ? (balanceRs / work.sanctionedRs) * 100 : 0,
    },
  ];
  const fundConfig = {
    amount: { label: "Funds" },
    balance: { color: "var(--chart-2)", label: "Balance" },
    returned: { color: "var(--chart-5)", label: "Returned" },
    spent: { color: "var(--chart-4)", label: "Spent" },
  } satisfies ChartConfig;
  const fundFill: Record<string, string> = {
    balance: "var(--chart-2)",
    returned: "var(--chart-5)",
    spent: "var(--chart-4)",
  };
  const fundData = slices.map((slice) => ({
    ...slice,
    fill: fundFill[slice.key] ?? "var(--chart-2)",
  }));

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader>
            <CardTitle className="font-normal">Expenditure over time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-50 w-full">
              <LineChart accessibilityLayer data={series} margin={{ bottom: 0, left: 0, right: 0, top: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  tick={{ fontSize: 12 }}
                  minTickGap={48}
                />
                <YAxis hide axisLine={false} tickLine={false} tickMargin={10} tick={{ fontSize: 12 }} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Line
                  connectNulls
                  dataKey="peer"
                  dot={false}
                  name={peerLabel}
                  stroke="var(--color-peer)"
                  strokeDasharray="5 5"
                  strokeLinecap="round"
                  strokeWidth={1}
                  type="linear"
                />
                <Line
                  dataKey="spent"
                  dot={false}
                  name="Spent"
                  stroke="var(--color-spent)"
                  strokeLinecap="round"
                  strokeWidth={3}
                  type="linear"
                />
              </LineChart>
            </ChartContainer>
            <p className="mt-2 text-muted-foreground text-xs">
              Cumulative releases against {peerLabel.toLowerCase()} — deterministic demo series from work totals.
            </p>
          </CardContent>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader>
            <CardTitle className="font-normal">Fund split</CardTitle>
          </CardHeader>
          <CardContent className="grid items-center gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
            <ChartContainer config={fundConfig} className="mx-auto aspect-square h-50">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel className="w-52" nameKey="account" />}
                />
                <Pie
                  cornerRadius={6}
                  data={fundData}
                  dataKey="amount"
                  innerRadius={65}
                  nameKey="account"
                  outerRadius={90}
                  paddingAngle={2}
                  strokeWidth={5}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (!(viewBox && "cx" in viewBox && "cy" in viewBox)) {
                        return null;
                      }
                      return (
                        <text dominantBaseline="middle" textAnchor="middle" x={viewBox.cx} y={viewBox.cy}>
                          <tspan className="fill-muted-foreground text-xs" x={viewBox.cx} y={(viewBox.cy ?? 0) - 8}>
                            Sanctioned
                          </tspan>
                          <tspan
                            className="fill-foreground font-heading font-medium text-lg tabular-nums"
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 14}
                          >
                            {formatMoneyRs(work.sanctionedRs)}
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex min-w-0 flex-col gap-3">
              {fundData.map((item) => (
                <div className="grid grid-cols-[1fr_auto] items-end gap-3" key={item.key}>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1">
                      <span
                        aria-hidden="true"
                        className="h-2 w-1 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <p className="truncate text-muted-foreground text-xs">{item.account}</p>
                    </div>
                    <p className="font-medium tabular-nums">{formatMoneyRs(item.amount)}</p>
                  </div>
                  <div className="font-medium tabular-nums">{item.percentage.toFixed(0)}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
