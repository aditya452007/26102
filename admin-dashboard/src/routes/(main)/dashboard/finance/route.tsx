import { createFileRoute } from "@tanstack/react-router";

import { Download, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { works } from "@/lib/mplads-mock";

import { BalanceDistributionCard } from "./-components/balance-distribution-card";
import { FinanceNotification } from "./-components/finance-notification";
import { IncomeBreakdown } from "./-components/income-breakdown";
import { OverviewKpis } from "./-components/overview-kpis";
import { QuickActions } from "./-components/quick-actions";
import { TransactionsOverviewCard } from "./-components/transactions-overview-card";
import { UpcomingTransactions } from "./-components/upcoming-transactions";
import { Wallet } from "./-components/wallet";

export const Route = createFileRoute("/(main)/dashboard/finance")({
  component: Page,
});

function downloadFundCsv() {
  const header = "work_id,title,state,district,status,sanctioned_rs,spent_rs,balance_rs,due_date";
  const lines = works.map((w) =>
    [
      w.id,
      `"${w.title}"`,
      w.state,
      w.district,
      w.status,
      w.sanctionedRs,
      w.expenditureRs,
      (w.sanctionedRs - w.expenditureRs).toFixed(1),
      w.dueDate,
    ].join(","),
  );
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mplads-fund-flow-demo.csv";
  anchor.click();
  URL.revokeObjectURL(url);
  toast.add({ title: "Export ready", description: "Demo fund-flow CSV downloaded (144 works)." });
}

function Page() {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl tracking-tight">Scheme fund flow</h1>
        <p className="text-muted-foreground text-sm">
          Where MPLADS money is released, spent and stuck · demo sample of 144 works.
        </p>
      </div>

      <Tabs defaultValue="30-days" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList variant="line">
            <TabsTrigger value="30-days">Dashboard</TabsTrigger>
            <TabsTrigger value="12-months">Accounts</TabsTrigger>
            <TabsTrigger value="custom">Transactions</TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <RotateCw className="size-4" />
              <span>Demo data · 7 Sept 2026</span>
            </div>
            <Button size="sm" variant="outline" onClick={downloadFundCsv}>
              <Download data-icon="inline-start" />
              Export
            </Button>
          </div>
        </div>

        <TabsContent value="30-days" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-6">
              <OverviewKpis />
            </div>

            <div className="flex flex-col gap-4 xl:col-span-6">
              <IncomeBreakdown />
              <FinanceNotification />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <TransactionsOverviewCard />
            </div>
            <div className="xl:col-span-5">
              <BalanceDistributionCard />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-4">
              <Wallet />
            </div>
            <div className="xl:col-span-4">
              <UpcomingTransactions />
            </div>
            <div className="xl:col-span-4">
              <QuickActions />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="12-months">
          <div className="flex h-64 items-center justify-center rounded-xl border border-border border-dashed text-muted-foreground">
            Accounts view coming soon.
          </div>
        </TabsContent>

        <TabsContent value="custom">
          <div className="flex h-64 items-center justify-center rounded-xl border border-border border-dashed text-muted-foreground">
            Transactions view coming soon.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
