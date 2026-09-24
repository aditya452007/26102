import { useMemo, useState } from "react";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoneyRs, works } from "@/lib/mplads-mock";

const DAY_MS = 24 * 60 * 60 * 1000;

interface MonthPoint {
  key: string;
  timestamp: number;
  plan: number;
  released: number;
  cumPlan: number;
  cumReleased: number;
}

function buildSeries(): MonthPoint[] {
  const byMonth = new Map<string, { plan: number; released: number }>();
  for (const w of works) {
    const key = w.sanctionDate.slice(0, 7);
    const entry = byMonth.get(key) ?? { plan: 0, released: 0 };
    entry.plan += w.sanctionedRs;
    entry.released += w.expenditureRs;
    byMonth.set(key, entry);
  }
  const keys = [...byMonth.keys()].sort();
  let cumPlan = 0;
  let cumReleased = 0;
  return keys.map((key) => {
    const entry = byMonth.get(key) ?? { plan: 0, released: 0 };
    cumPlan += entry.plan;
    cumReleased += entry.released;
    const [y, m] = key.split("-").map(Number);
    return {
      key,
      timestamp: Date.UTC(y, m - 1, 1),
      plan: entry.plan,
      released: entry.released,
      cumPlan,
      cumReleased,
    };
  });
}

const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  month: "short",
  year: "2-digit",
});

const formatMonth = (value: number) => monthFormatter.format(new Date(value));

const formatTooltipMoney = (value: number | string) => formatMoneyRs(Number(value));

const chartConfig = {
  released: {
    color: "var(--chart-4)",
    label: "Released",
  },
  plan: {
    color: "var(--chart-2)",
    label: "Plan",
  },
} satisfies ChartConfig;

const releaseViewItems = [
  { value: "cumulative", label: "Cumulative" },
  { value: "monthly", label: "Monthly" },
] as const;

type ReleaseView = (typeof releaseViewItems)[number]["value"];

export function TransactionsOverviewCard() {
  const [view, setView] = useState<ReleaseView>("cumulative");
  const series = useMemo(() => buildSeries(), []);
  const chartData = useMemo(
    () =>
      series.map((point) => ({
        timestamp: point.timestamp,
        label: point.key,
        released: view === "cumulative" ? point.cumReleased : point.released,
        plan: view === "cumulative" ? point.cumPlan : point.plan,
      })),
    [series, view],
  );
  const ticks = useMemo(
    () =>
      series
        .filter(
          (point) =>
            point.key.endsWith("-01") ||
            point.key.endsWith("-04") ||
            point.key.endsWith("-07") ||
            point.key.endsWith("-10"),
        )
        .map((point) => point.timestamp),
    [series],
  );
  const domain = useMemo(
    () =>
      chartData.length > 0
        ? [chartData[0].timestamp, chartData[chartData.length - 1].timestamp + 30 * DAY_MS]
        : undefined,
    [chartData],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal">Releases vs plan</CardTitle>
        <CardAction>
          <Select items={releaseViewItems} value={view} onValueChange={(value) => setView(value as ReleaseView)}>
            <SelectTrigger className="w-32" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {releaseViewItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent>
        <p className="pb-2 text-muted-foreground text-xs">
          Cumulative sanctioned (plan, dashed) vs released (solid) by sanction month · demo-derived from 144 works.
        </p>
        <ChartContainer config={chartConfig} className="h-50 w-full">
          <LineChart accessibilityLayer data={chartData} margin={{ bottom: 0, left: 0, right: 0, top: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="timestamp"
              domain={domain}
              scale="time"
              tickFormatter={formatMonth}
              tickLine={false}
              tickMargin={10}
              ticks={ticks}
              tick={{ fontSize: 12 }}
              type="number"
            />
            <YAxis hide axisLine={false} tickLine={false} tickMargin={10} tick={{ fontSize: 12 }} />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => (
                <ChartTooltipContent
                  active={active}
                  hideLabel
                  label={label}
                  payload={payload?.map((item) => ({
                    ...item,
                    value: typeof item.value === "number" ? formatTooltipMoney(item.value) : item.value,
                  }))}
                />
              )}
            />
            <Line
              connectNulls
              dataKey="plan"
              dot={false}
              stroke="var(--color-plan)"
              strokeDasharray="5 5"
              strokeLinecap="round"
              strokeWidth={1}
              type="linear"
            />
            <Line
              dataKey="released"
              dot={false}
              stroke="var(--color-released)"
              strokeLinecap="round"
              strokeWidth={3}
              type="linear"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
