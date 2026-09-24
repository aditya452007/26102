import { Link } from "@tanstack/react-router";

import { Ellipsis } from "lucide-react";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoneyRs, works } from "@/lib/mplads-mock";

const DEMO_TODAY_MS = Date.UTC(2026, 8, 7);

const longestStalls = [...works]
  .map((w) => ({
    work: w,
    days: Math.round((DEMO_TODAY_MS - Date.parse(`${w.lastUpdate}T00:00:00Z`)) / 86400000),
    balance: w.sanctionedRs - w.expenditureRs,
  }))
  .sort((a, b) => b.days - a.days)
  .slice(0, 5);

export function TopPages() {
  return (
    <Card className="h-full gap-2">
      <CardHeader>
        <CardTitle className="font-normal">Longest stalls</CardTitle>
        <CardAction>
          <Ellipsis className="size-4" />
        </CardAction>
      </CardHeader>

      <CardContent className="px-0">
        <Table className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4">
          <TableHeader className="[&_tr]:border-border/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-8" />
              <TableHead className="h-8 w-28 text-right font-normal">District</TableHead>
              <TableHead className="h-8 w-20 text-right font-normal">Stall</TableHead>
              <TableHead className="h-8 w-24 text-right font-normal">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr]:border-border/50">
            {longestStalls.map(({ work, days, balance }) => (
              <TableRow className="hover:bg-transparent" key={work.id}>
                <TableCell className="max-w-0 truncate py-4 font-medium">
                  <Link
                    to="/dashboard/works/$workId"
                    params={{ workId: work.id }}
                    search={{ tab: "overview", view: "grid", lens: "all", state: "", district: "", type: "", q: "" }}
                    className="hover:underline"
                  >
                    {work.id} · {work.title}
                  </Link>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{work.district}</TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">{days}d</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoneyRs(balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
