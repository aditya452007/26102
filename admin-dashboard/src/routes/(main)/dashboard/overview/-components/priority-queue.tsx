import { Link } from "@tanstack/react-router";
import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoneyRs } from "@/lib/mplads-mock";

import type { QueueRow } from "./data";

const SEVERITY_STYLES: Record<QueueRow["anomaly"]["severity"], string> = {
  high: "border-destructive/20 bg-destructive/10 text-destructive",
  medium: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  low: "border-muted-foreground/20 bg-muted text-muted-foreground",
};

const SEVERITY_DOT: Record<QueueRow["anomaly"]["severity"], string> = {
  high: "bg-destructive",
  medium: "bg-amber-500",
  low: "bg-muted-foreground",
};

export function PriorityQueue({ rows }: { readonly rows: ReadonlyArray<QueueRow> }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Needs your attention</CardTitle>
        <CardDescription>Demo sample · 144 works</CardDescription>
        <CardAction>
          <a className="text-primary text-sm hover:underline" href="/dashboard/works?lens=high-risk">
            View all →
          </a>
        </CardAction>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>All clear</EmptyTitle>
              <EmptyDescription>All clear — no high-risk works in scope.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table className="**:data-[slot=table-cell]:px-4 **:data-[slot=table-head]:px-4">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 font-medium text-muted-foreground">Severity</TableHead>
                <TableHead className="h-11 font-medium text-muted-foreground">Work</TableHead>
                <TableHead className="h-11 font-medium text-muted-foreground">Reason</TableHead>
                <TableHead className="h-11 font-medium text-muted-foreground">District</TableHead>
                <TableHead className="h-11 text-right font-medium text-muted-foreground">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ work, anomaly, reason }) => (
                <TableRow key={work.id} className="cursor-pointer border-border/60 hover:bg-muted/20">
                  <TableCell className="py-3 align-middle">
                    <Badge
                      className={cn(
                        "gap-1.5 rounded-sm border font-medium capitalize",
                        SEVERITY_STYLES[anomaly.severity],
                      )}
                      variant="outline"
                    >
                      <span className={cn("size-1.5 rounded-full", SEVERITY_DOT[anomaly.severity])} />
                      {anomaly.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 align-middle">
                    <Link
                      className="hover:underline"
                      to="/dashboard/works/$workId"
                      params={{ workId: work.id }}
                      search={{ tab: "anomalies", view: "grid", lens: "all", state: "", district: "", type: "", q: "" }}
                    >
                      <span className="block font-medium text-sm">{work.title}</span>
                      <span className="block font-mono text-muted-foreground text-xs">#{work.id}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-64 truncate py-3 align-middle text-sm">{reason}</TableCell>
                  <TableCell className="py-3 align-middle text-muted-foreground text-sm">{work.district}</TableCell>
                  <TableCell className="py-3 text-right align-middle text-sm tabular-nums">
                    {formatMoneyRs(anomaly.actualRs ?? work.sanctionedRs)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
