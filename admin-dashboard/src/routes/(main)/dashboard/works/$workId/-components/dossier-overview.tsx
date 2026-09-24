import { CalendarDays, CircleCheck, Clock3 } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { formatINR, formatWorkDate } from "@/lib/mplads-mock";
import type { Decision, Work } from "@/lib/mplads-schema";

import { DECISION_META, relativeDay, TYPE_LABELS } from "./dossier-data";

interface DossierOverviewProps {
  work: Work;
  decision: Decision | undefined;
  stallDays: number;
  utilisationPct: number;
}

const STATUS_LABELS: Record<Work["status"], string> = {
  completed: "Completed",
  "in-execution": "In execution",
  sanctioned: "Sanctioned",
  stalled: "Stalled",
};

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={mono ? "font-mono text-sm tabular-nums" : "text-sm"}>{value}</span>
    </div>
  );
}

export function DossierOverview({ work, decision, stallDays, utilisationPct }: DossierOverviewProps) {
  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_auto_18rem]">
      <div className="py-4 lg:pr-6">
        <div className="flex flex-col gap-2">
          <h2 className="font-heading font-medium text-base">Work details</h2>
          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3 xl:gap-12">
            <div className="flex flex-col gap-5">
              <Fact label="Sanctioned" value={formatINR(work.sanctionedRs)} mono />
              <Fact label="Spent" value={formatINR(work.expenditureRs)} mono />
              <Fact label="Utilisation" value={`${utilisationPct.toFixed(0)}%`} mono />
            </div>
            <div className="flex flex-col gap-5">
              <Fact label="Agency" value={work.agency} />
              <Fact label="Work type" value={TYPE_LABELS[work.type]} />
              <Fact label="Status" value={STATUS_LABELS[work.status]} />
            </div>
            <div className="flex flex-col gap-5">
              <Fact label="Sanction date" value={formatWorkDate(work.sanctionDate)} />
              <Fact label="Due date" value={formatWorkDate(work.dueDate)} />
              <Fact
                label="Last update"
                value={`${formatWorkDate(work.lastUpdate)} (${relativeDay(work.lastUpdate)})`}
              />
            </div>
          </div>
        </div>
      </div>

      <Separator className="hidden lg:block" orientation="vertical" />

      <div className="py-4 lg:pl-6">
        <aside>
          <div className="flex flex-col gap-4">
            <h2 className="font-heading font-medium text-sm">Record status</h2>
            <div className="flex items-start gap-2">
              <CircleCheck aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">
                  {decision ? DECISION_META[decision.status].label : "Active review"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {decision ? "Decision recorded — see activity" : "Flagged by NIRIKSHAN — needs review"}
                </p>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              {decision
                ? `Updated ${relativeDay(decision.at)} by ${decision.by}`
                : `Updated ${relativeDay(work.lastUpdate)} by field report`}
            </p>
          </div>

          <Separator className="my-4" />

          <div className="flex flex-col gap-3">
            <h2 className="font-heading font-medium text-sm">Key dates</h2>
            <div className="flex flex-col">
              <div className="flex gap-3 py-2.5">
                <CalendarDays aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Due date</p>
                  <p className="text-muted-foreground text-xs">{formatWorkDate(work.dueDate)}</p>
                </div>
              </div>
              <Separator />
              <div className="flex gap-3 py-2.5">
                <Clock3 aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Last update</p>
                  <p className="text-muted-foreground text-xs">
                    {formatWorkDate(work.lastUpdate)} · {stallDays}d without update
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
