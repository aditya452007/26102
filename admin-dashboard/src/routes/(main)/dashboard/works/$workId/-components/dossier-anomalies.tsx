import { Link } from "@tanstack/react-router";

import { ArrowLeftRight, Clock, FileText, MessagesSquare, Sparkles, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { compareSentence, formatMoneyRs } from "@/lib/mplads-mock";
import type { Anomaly, Work } from "@/lib/mplads-schema";

import { type DossierTab, SEVERITY_BAR, SEVERITY_DOT, SEVERITY_STYLES, TYPE_LABELS } from "./dossier-data";

interface DossierAnomaliesProps {
  work: Work;
  flags: Anomaly[];
  evidenceCount: number;
  ucPending: boolean;
  onGoTab: (tab: DossierTab) => void;
  onAskAI: (question: string, flag: Anomaly) => void;
}

const KIND_LABELS: Record<Anomaly["kind"], string> = {
  cost: "Cost",
  delay: "Delay",
  duplicate: "Duplicate",
  expenditure: "Expenditure",
  utilisation: "Utilisation",
};

const AI_SENTENCES: Record<Anomaly["kind"], string> = {
  cost: "Warrants manual review — sanctioned cost is far above peers and execution has stalled.",
  delay: "Warrants manual review — the site has gone quiet past the review threshold.",
  duplicate: "Warrants manual review — scope may overlap a nearby sanctioned work.",
  expenditure: "Warrants manual review — funds are releasing faster than physical progress.",
  utilisation: "Warrants manual review — utilisation trails peers with the certificate pending.",
};

const SEVERITY_BORDER: Record<Anomaly["severity"], string> = {
  high: "border-l-destructive",
  low: "border-l-sky-500",
  medium: "border-l-amber-500",
};

function signalIcon(label: string) {
  if (/stall|update|duration|due/i.test(label)) {
    return Clock;
  }
  if (/peer|median|duplicate/i.test(label)) {
    return ArrowLeftRight;
  }
  if (/spend|progress|release|sanction/i.test(label)) {
    return Wallet;
  }
  return FileText;
}

function PeerBar({ actual, median, severity }: { actual: number; median: number; severity: Anomaly["severity"] }) {
  const max = Math.max(actual, median, 1) * 1.1;
  return (
    <div className="flex flex-col gap-1">
      <div
        className="relative h-3 rounded-full bg-muted"
        role="img"
        aria-label={`Actual ${formatMoneyRs(actual)} against peer median ${formatMoneyRs(median)}`}
      >
        <div
          className={`h-full rounded-full ${SEVERITY_BAR[severity]}`}
          style={{ width: `${(actual / max) * 100}%` }}
        />
        <div
          aria-hidden="true"
          className="absolute top-[-3px] h-[18px] w-1 rounded-full bg-foreground"
          style={{ left: `calc(${(median / max) * 100}% - 2px)` }}
        />
      </div>
      <div className="flex justify-between text-muted-foreground text-xs">
        <span>
          Peer median <span className="font-medium text-foreground tabular-nums">{formatMoneyRs(median)}</span>
        </span>
        <span>
          This work <span className="font-medium text-foreground tabular-nums">{formatMoneyRs(actual)}</span>
        </span>
      </div>
    </div>
  );
}

function PeerTable({ flag, work }: { flag: Anomaly; work: Work }) {
  if (flag.actualRs === null || flag.peerMedianRs === null) {
    return null;
  }
  const ratio = flag.peerMedianRs > 0 ? (flag.actualRs / flag.peerMedianRs).toFixed(1) : "—";
  const rows: Array<[string, string]> = [
    ["Peer group", `${flag.peerN} similar ${TYPE_LABELS[work.type].toLowerCase()} works in ${work.district}`],
    ["Peer median", formatMoneyRs(flag.peerMedianRs)],
    ["This work", formatMoneyRs(flag.actualRs)],
    ["Deviation", `${ratio}× the median`],
  ];
  return (
    <dl className="grid gap-x-6 sm:grid-cols-2">
      {rows.map(([term, value]) => (
        <div key={term} className="flex items-baseline justify-between gap-3 border-b py-1.5 last:border-b-0">
          <dt className="text-muted-foreground text-xs">{term}</dt>
          <dd className="text-right text-sm tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DossierAnomalies({ work, flags, evidenceCount, ucPending, onGoTab, onAskAI }: DossierAnomaliesProps) {
  const duplicateFlag = flags.find((flag) => flag.kind === "duplicate");
  const twinSignal =
    duplicateFlag?.signals.find((signal) => /duplicate|near/i.test(signal.label)) ?? duplicateFlag?.signals[0];

  if (flags.length === 0) {
    return (
      <div className="flex flex-col gap-4 py-4">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No open flags</EmptyTitle>
            <EmptyDescription>NIRIKSHAN found no anomalies for this work in the demo dataset.</EmptyDescription>
          </EmptyHeader>
        </Empty>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No overlapping scope found</EmptyTitle>
            <EmptyDescription>No overlapping scope found in demo data.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      {flags.map((flag) => {
        const hasNumbers = flag.actualRs !== null && flag.peerMedianRs !== null;
        return (
          <Card key={flag.id} className={`border-l-4 ${SEVERITY_BORDER[flag.severity]}`}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={`gap-1.5 rounded-sm border font-medium capitalize ${SEVERITY_STYLES[flag.severity]}`}
                  variant="outline"
                >
                  <span className={`size-1.5 rounded-full ${SEVERITY_DOT[flag.severity]}`} />
                  {flag.severity}
                </Badge>
                <Badge className="rounded-sm" variant="outline">
                  {KIND_LABELS[flag.kind]}
                </Badge>
              </div>
              <CardTitle className="text-base">{flag.headline}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-4">
                {hasNumbers && (
                  <>
                    <p className="text-2xl tabular-nums">
                      <span className={flag.severity === "high" ? "text-destructive" : "text-foreground"}>
                        {formatMoneyRs(flag.actualRs as number)}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        vs {formatMoneyRs(flag.peerMedianRs as number)} median
                      </span>
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {compareSentence(
                        flag.actualRs as number,
                        flag.peerMedianRs as number,
                        flag.peerN,
                        work.type,
                        work.district,
                      )}
                    </p>
                    <PeerBar
                      actual={flag.actualRs as number}
                      median={flag.peerMedianRs as number}
                      severity={flag.severity}
                    />
                  </>
                )}
                <PeerTable flag={flag} work={work} />
                <div className="flex flex-col gap-2">
                  {flag.signals.map((signal) => {
                    const Icon = signalIcon(signal.label);
                    return (
                      <div key={signal.label} className="flex items-start gap-2 text-sm">
                        <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <p>
                          <span className="text-muted-foreground">{signal.label}: </span>
                          {signal.value}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge className="rounded-sm" variant="outline">
                    {evidenceCount} evidence file{evidenceCount === 1 ? "" : "s"} linked
                  </Badge>
                  <Badge
                    className={
                      ucPending
                        ? "rounded-sm border-amber-600/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "rounded-sm"
                    }
                    variant="outline"
                  >
                    UC {ucPending ? "pending" : "on record"}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">{AI_SENTENCES[flag.kind]}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => onGoTab("financials")}>
                  Compare peers
                </Button>
                <Button size="sm" variant="outline" onClick={() => onGoTab("evidence")}>
                  View evidence
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onAskAI("Why was this flagged?", flag)}>
                  <Sparkles data-icon="inline-start" />
                  Ask AI
                </Button>
                <Button size="sm" variant="ghost" nativeButton={false} render={<Link to="/chat" />}>
                  <MessagesSquare data-icon="inline-start" />
                  Open in chat
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
      <p className="text-muted-foreground text-xs">
        Flags mean “needs review,” never fraud · peer groups are {TYPE_LABELS[work.type].toLowerCase()} works in{" "}
        {work.district}.
      </p>
      {duplicateFlag && twinSignal ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-sm" variant="outline">
                Overlap verdict
              </Badge>
            </div>
            <CardTitle className="text-base">{duplicateFlag.headline}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-start gap-2 text-sm">
              <ArrowLeftRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p>
                <span className="text-muted-foreground">{twinSignal.label}: </span>
                {twinSignal.value}
              </p>
            </div>
            <p className="text-muted-foreground text-sm">{duplicateFlag.corroboration}</p>
          </CardContent>
        </Card>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No overlapping scope found</EmptyTitle>
            <EmptyDescription>No overlapping scope found in demo data.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
