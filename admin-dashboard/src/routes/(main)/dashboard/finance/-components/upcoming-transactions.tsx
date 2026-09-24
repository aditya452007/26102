import { Link } from "@tanstack/react-router";

import { ChevronRight, Landmark, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { formatMoneyRs, formatWorkDate, works } from "@/lib/mplads-mock";

const topBalances = [...works]
  .map((w) => ({ work: w, balance: w.sanctionedRs - w.expenditureRs }))
  .sort((a, b) => b.balance - a.balance)
  .slice(0, 5);

const heldTotal = topBalances.reduce((total, entry) => total + entry.balance, 0);

const earliestDue = [...topBalances].sort((a, b) => (a.work.dueDate < b.work.dueDate ? -1 : 1))[0];

export function UpcomingTransactions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal">Largest unspent balances</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="flex items-baseline text-3xl tabular-nums leading-none tracking-tight">
              <span className="font-normal">{formatMoneyRs(heldTotal)}</span>
            </h2>
            <p className="text-muted-foreground text-sm leading-none">
              held by <span className="font-medium text-foreground">{topBalances.length}</span> works · demo sample
            </p>
          </div>
          <div className="flex w-max items-center gap-2 rounded-md border border-border bg-muted/70 px-2 py-1.5 text-sm">
            <Zap className="size-4 fill-primary text-primary" />
            <span className="text-muted-foreground">
              Earliest due{" "}
              <span className="font-medium text-foreground">
                {earliestDue.work.id} · {formatWorkDate(earliestDue.work.dueDate)}
              </span>
            </span>
          </div>
        </div>

        <ItemGroup>
          {topBalances.map(({ work, balance }) => (
            <Item
              key={work.id}
              variant="outline"
              size="xs"
              render={
                <Link
                  to="/dashboard/works/$workId"
                  params={{ workId: work.id }}
                  search={{ tab: "overview", view: "grid", lens: "all", state: "", district: "", type: "", q: "" }}
                />
              }
            >
              <ItemMedia>
                <div className="grid size-9 place-items-center rounded-md border bg-background">
                  <Landmark className="size-4" />
                </div>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>
                  {work.id} · {formatMoneyRs(balance)} unspent
                </ItemTitle>
                <ItemDescription>
                  {work.title} • due {formatWorkDate(work.dueDate)}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <ChevronRight className="size-5 text-muted-foreground" />
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
