import { Label, Pie, PieChart } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatMoneyRs, works } from "@/lib/mplads-mock";

type FundKey = "released" | "balance";

const sanctioned = works.reduce((total, w) => total + w.sanctionedRs, 0);
const spent = works.reduce((total, w) => total + w.expenditureRs, 0);
const balance = sanctioned - spent;

const fundData: {
  account: string;
  amount: number;
  key: FundKey;
  percentage: number;
}[] = [
  {
    account: "Released · spent",
    amount: spent,
    key: "released",
    percentage: (spent / sanctioned) * 100,
  },
  {
    account: "Balance · unspent",
    amount: balance,
    key: "balance",
    percentage: (balance / sanctioned) * 100,
  },
];

const chartConfig = {
  amount: {
    label: "Funds",
  },
  released: {
    color: "var(--chart-2)",
    label: "Released · spent",
  },
  balance: {
    color: "var(--chart-3)",
    label: "Balance · unspent",
  },
} satisfies ChartConfig;

const getAccountColor = (key: FundKey) => {
  const config = chartConfig[key];

  return "color" in config ? config.color : undefined;
};

const chartData = fundData.map((item) => ({
  ...item,
  percentage: item.percentage.toFixed(1),
  fill: getAccountColor(item.key),
}));

export function BalanceDistributionCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal">Fund allocation</CardTitle>
        <CardAction>
          <Badge variant="outline">Demo · {works.length} works</Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="grid items-center gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-50">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel className="w-52" nameKey="account" />}
            />
            <Pie
              cornerRadius={6}
              data={chartData}
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
                        {formatMoneyRs(sanctioned)}
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="flex min-w-0 flex-col gap-3">
          {chartData.map((item) => (
            <div className="grid grid-cols-[1fr_auto] items-end gap-3" key={item.key}>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1">
                  <span aria-hidden="true" className="h-2 w-1 rounded-full" style={{ backgroundColor: item.fill }} />
                  <p className="truncate text-muted-foreground text-xs">{item.account}</p>
                </div>
                <p className="font-medium tabular-nums">{formatMoneyRs(item.amount)}</p>
              </div>
              <div className="font-medium tabular-nums">{item.percentage}%</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
