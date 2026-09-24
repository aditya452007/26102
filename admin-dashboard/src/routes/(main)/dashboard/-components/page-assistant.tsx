import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "cn";
import { differenceInCalendarDays } from "date-fns";
import { Send, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  anomalies,
  compareSentence,
  DEMO_TODAY_ISO,
  evidences,
  FLAGSHIP_WORK_ID,
  formatMoneyRs,
  geoRollup,
  MPLADS_KPIS,
  works,
} from "@/lib/mplads-mock";
import type { Anomaly } from "@/lib/mplads-schema";

export interface PageAssistantProps {
  contextTitle: string;
  summary: string;
  chips: readonly string[];
  answer: (question: string) => string;
}

interface AiMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
}

const SEVERITY_RANK: Record<Anomaly["severity"], number> = { high: 0, medium: 1, low: 2 };

function parseDay(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dossierAnswer(
  question: string,
  workId: string,
  top: Anomaly | undefined,
  flags: Anomaly[],
  evidenceCount: number,
  stallDays: number,
): string {
  const work = works.find((candidate) => candidate.id === workId);
  if (!work) {
    return `No work matches #${workId} in the demo dataset. Back to Works to pick a flagged case.`;
  }
  if (question === "Compare with peers") {
    if (top?.actualRs != null && top?.peerMedianRs != null) {
      const ratio = top.peerMedianRs > 0 ? (top.actualRs / top.peerMedianRs).toFixed(1) : "—";
      return `Peer picture: ${top.peerN} similar ${work.type} works in ${work.district}. Median ${formatMoneyRs(top.peerMedianRs)} vs this work ${formatMoneyRs(top.actualRs)} — ${ratio}× the median. ${top.corroboration}`;
    }
    return top
      ? `${top.headline}. ${top.corroboration}`
      : "No peer comparison available for this work in the demo dataset.";
  }
  if (question === "What's missing?") {
    return [
      "To close this review you still need:",
      `— Utilisation certificate for the last tranche (${evidenceCount} file(s) attached so far)`,
      `— Fresh field report (last update ${stallDays}d ago; fortnightly expected)`,
      "— Joint site check if the duplicate-scope flag stays open",
    ].join("\n");
  }
  if (!top) {
    return `No open flags on #${work.id} — nothing to explain in the demo dataset.`;
  }
  if (top.actualRs !== null && top.peerMedianRs !== null) {
    return `${compareSentence(top.actualRs, top.peerMedianRs, top.peerN, work.type, work.district)}. ${top.corroboration} ${flags.length > 1 ? `(${flags.length} open flags on this work.)` : ""}`;
  }
  return `${top.headline}. ${top.corroboration}`;
}

function dossierContext(workId: string): PageAssistantProps {
  const chips = ["Why was this flagged?", "Compare with peers", "What's missing?"] as const;
  const work = works.find((candidate) => candidate.id === workId);
  if (!work) {
    const summary = `No work matches #${workId} in the demo dataset.`;
    return {
      contextTitle: `Dossier #${workId} — not found`,
      summary,
      chips,
      answer: () => summary,
    };
  }
  const flags = anomalies
    .filter((anomaly) => anomaly.workId === workId)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  const top = flags[0];
  const evidenceCount = evidences.filter((item) => item.workId === workId).length;
  const stallDays = differenceInCalendarDays(parseDay(DEMO_TODAY_ISO), parseDay(work.lastUpdate));
  const summary = top
    ? `Reviewing #${work.id}: ${top.headline}. Ask why, how it compares, or what is missing.`
    : `Reviewing #${work.id}: no open flags in the demo dataset.`;
  return {
    contextTitle: `Dossier #${work.id} — top flag`,
    summary,
    chips,
    answer: (question: string) => dossierAnswer(question, workId, top, flags, evidenceCount, stallDays),
  };
}

export function resolvePageContext(pathname: string): PageAssistantProps {
  const clean = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

  if (clean.startsWith("/dashboard/works/")) {
    const workId = clean.slice("/dashboard/works/".length).split("/")[0] ?? "";
    if (workId) {
      return dossierContext(workId);
    }
  }

  const demoTotal = works.length;
  const reviewCount = anomalies.length;
  const highCount = anomalies.filter((anomaly) => anomaly.severity === "high").length;
  const mediumCount = anomalies.filter((anomaly) => anomaly.severity === "medium").length;
  const lowCount = anomalies.filter((anomaly) => anomaly.severity === "low").length;
  const stalledDemo = works.filter((work) => work.status === "stalled").length;
  const utilisationCount = anomalies.filter((anomaly) => anomaly.kind === "utilisation").length;
  const evidenceTotal = evidences.length;
  const topState = [...geoRollup].sort((a, b) => b.high - a.high)[0];

  if (clean === "/dashboard/overview") {
    const summary = `Scheme snapshot: ${MPLADS_KPIS.totalWorks.toLocaleString("en-IN")} works · ${MPLADS_KPIS.underExecution.toLocaleString("en-IN")} under execution · ${MPLADS_KPIS.delayed} delayed · ${MPLADS_KPIS.highRisk} high-risk · ${formatMoneyRs(MPLADS_KPIS.overrunExposureRs)} overrun exposure. Top case ${FLAGSHIP_WORK_ID} is 2.4× its peer median with a 96d stall.`;
    const chips = ["What needs attention?", "Where is risk concentrated?", "What is overrun exposure?"] as const;
    return {
      contextTitle: "Overview — scheme snapshot",
      summary,
      chips,
      answer: (question: string) => {
        if (question === "Where is risk concentrated?") {
          return topState
            ? `Highest demo concentration: ${topState.state} with ${topState.high} high-risk of ${topState.works} demo works. The map filters the 8-row priority queue by state.`
            : "No state rollup available in the demo dataset.";
        }
        if (question === "What is overrun exposure?") {
          return `${formatMoneyRs(MPLADS_KPIS.overrunExposureRs)} above peer estimates across the scheme. Flagship ${FLAGSHIP_WORK_ID}: ₹1.90 Cr vs ₹0.78 Cr median across 18 similar community-hall works in Bhopal.`;
        }
        return `${MPLADS_KPIS.highRisk} high-risk works need review now; ${MPLADS_KPIS.delayed} are past due date. Start with ${FLAGSHIP_WORK_ID}, then the 8-row priority queue.`;
      },
    };
  }

  if (clean === "/dashboard/works") {
    const summary = `Works queue: ${demoTotal} demo works · ${reviewCount} need review · ${highCount} high-risk. Sorted severity-first, ${FLAGSHIP_WORK_ID} on top.`;
    const chips = ["What needs review?", "Which are high-risk?", "How is the queue sorted?"] as const;
    return {
      contextTitle: "Works — queue",
      summary,
      chips,
      answer: (question: string) => {
        if (question === "Which are high-risk?") {
          return `${highCount} high-risk in demo: cost, duplicate-scope, delay, expenditure and utilisation flags. Open the top row (${FLAGSHIP_WORK_ID}) for the explained case file.`;
        }
        if (question === "How is the queue sorted?") {
          return "Severity first (high → medium → low → clear), then sanctioned amount. URL filters ?lens=&state=&district=&type=&q= are shareable and restore on reload.";
        }
        return `${reviewCount} of ${demoTotal} demo works need review (${highCount} high · ${mediumCount} medium · ${lowCount} low). Use lens All / Needs review / High-risk to triage.`;
      },
    };
  }

  if (clean === "/dashboard/finance") {
    const summary = `Fund flow: ${formatMoneyRs(MPLADS_KPIS.overrunExposureRs)} overrun exposure · ${utilisationCount} utilisation flags · ${evidenceTotal} evidence files linked. Next releases depend on UCs.`;
    const chips = ["Where is overrun exposure?", "What is utilisation risk?", "Which tranches need UCs?"] as const;
    return {
      contextTitle: "Fund Flow — releases vs utilisation",
      summary,
      chips,
      answer: (question: string) => {
        if (question === "Where is overrun exposure?") {
          return `${formatMoneyRs(MPLADS_KPIS.overrunExposureRs)} above peer estimates. Largest demo variance: ${FLAGSHIP_WORK_ID} at ₹1.90 Cr vs ₹0.78 Cr peer median (18 similar works, Bhopal).`;
        }
        if (question === "Which tranches need UCs?") {
          return `${utilisationCount} utilisation flags have UCs pending for the last tranche. Attach the certificate in Documents before the next release.`;
        }
        return `Utilisation risk: low spend against sanctioned cost with certificates awaited. ${evidenceTotal} files attached so far across flagged works.`;
      },
    };
  }

  if (clean === "/dashboard/analytics") {
    const summary = `Performance: ${MPLADS_KPIS.delayed} delayed scheme-wide · ${stalledDemo} stalled in demo · ${MPLADS_KPIS.highRisk} high-risk. Delays cluster with cost variance.`;
    const chips = ["Why are works delayed?", "Which states lag most?", "What is stalled vs delayed?"] as const;
    return {
      contextTitle: "Performance — delays and risk",
      summary,
      chips,
      answer: (question: string) => {
        if (question === "Which states lag most?") {
          return topState
            ? `${topState.state} leads the demo lag with ${topState.delayed} delayed and ${topState.stalled} stalled of ${topState.works} works.`
            : "No state rollup available in the demo dataset.";
        }
        if (question === "What is stalled vs delayed?") {
          return `Stalled: no field update for 90d+ (${stalledDemo} in demo). Delayed: past due date at low progress (${MPLADS_KPIS.delayed} scheme-wide). A work can be both.`;
        }
        return `Top delay pattern: 96d stall on ${FLAGSHIP_WORK_ID} corroborates its cost flag. Field reports are expected fortnightly.`;
      },
    };
  }

  if (clean === "/dashboard/tasks") {
    const summary = `Verifications: ${reviewCount} flags need review (${highCount} high · ${mediumCount} medium · ${lowCount} low). Decisions record Verified, Dismissed or Action Required.`;
    const chips = ["What should I verify first?", "What is high-risk?", "How do I record a decision?"] as const;
    return {
      contextTitle: "Verifications — review queue",
      summary,
      chips,
      answer: (question: string) => {
        if (question === "What is high-risk?") {
          return `${highCount} high-risk demo flags: cost outlier, duplicate scope, long stall, front-loaded spend. Each carries peer N, median vs actual, and one corroborating signal.`;
        }
        if (question === "How do I record a decision?") {
          return "Open the dossier, review anomalies and evidence, then set Verified, Dismissed or Action Required with a note. It lands in the activity timeline.";
        }
        return `Start with ${FLAGSHIP_WORK_ID} (cost 2.4× median + 96d stall, double signal), then the remaining ${highCount - 1} high-risk flags.`;
      },
    };
  }

  if (clean === "/dashboard/calendar") {
    const summary = `Deadlines: ${MPLADS_KPIS.delayed} past due scheme-wide · ${stalledDemo} stalled in demo (91–180d without update). Fortnightly field reports expected.`;
    const chips = ["What is overdue?", "What is stalled?", "What needs a field update?"] as const;
    return {
      contextTitle: "Deadlines — due and stalled",
      summary,
      chips,
      answer: (question: string) => {
        if (question === "What is stalled?") {
          return `${stalledDemo} demo works stalled 91–180d, including ${FLAGSHIP_WORK_ID} at 96d. A stall past 90d raises a delay flag that needs review.`;
        }
        if (question === "What needs a field update?") {
          return "Any work past 14d without a field report, and every stalled work before its next release. The dossier shows last-update age per work.";
        }
        return `${MPLADS_KPIS.delayed} works past due date. In demo, sort Works by Updated to surface the oldest field reports first.`;
      },
    };
  }

  if (clean === "/dashboard/file-manager") {
    const summary = `Documents: ${evidenceTotal} evidence files linked (photos, measurement sheets, certificates) across ${reviewCount} flagged works.`;
    const chips = ["What evidence exists?", "What is missing?", "How is evidence linked?"] as const;
    return {
      contextTitle: "Documents — evidence",
      summary,
      chips,
      answer: (question: string) => {
        if (question === "What is missing?") {
          return "Still needed to close reviews: utilisation certificate for the last tranche, a fresh fortnightly field report, and a joint site check where duplicate scope stays open.";
        }
        if (question === "How is evidence linked?") {
          return "Files attach to a work inside its dossier Evidence tab and appear in the activity timeline. Flags cite the linked files as corroboration.";
        }
        return `${evidenceTotal} demo files: site photos, measurement sheets, estimate comparatives and draft certificates. Each shows size, uploader and upload date.`;
      },
    };
  }

  if (clean === "/dashboard/invoice") {
    const summary = `UC tracking: ${utilisationCount} utilisation flags await certificates · ${evidenceTotal} files attached. No UC means no next tranche.`;
    const chips = ["Which works lack UCs?", "What blocks next release?", "What proves utilisation?"] as const;
    return {
      contextTitle: "UC Tracking — utilisation certificates",
      summary,
      chips,
      answer: (question: string) => {
        if (question === "Which works lack UCs?") {
          return `${utilisationCount} demo works carry utilisation flags with UCs pending for the last tranche. Open each dossier Evidence tab to confirm.`;
        }
        if (question === "What proves utilisation?") {
          return "A signed utilisation certificate plus measurement sheet and a fresh site photo. All three should agree on spend vs physical progress.";
        }
        return "Next release is blocked until the UC for the last tranche is attached and the field report is under 14d old.";
      },
    };
  }

  if (clean === "/dashboard/notifications") {
    const summary = `Notifications: attention items derived from high-risk flags, stalls, UC-pending and overdue works. Open any row to verify in its dossier.`;
    const chips = ["What needs attention?", "How do I clear these?", "Where do I change preferences?"] as const;
    return {
      contextTitle: "Notifications — attention items",
      summary,
      chips,
      answer: (question: string) => {
        if (question === "How do I clear these?") {
          return "Open the work to mark its item read, or use Mark all read. Clearing a notification never changes the underlying flag — verify in the dossier and record a decision.";
        }
        if (question === "Where do I change preferences?") {
          return "Settings → Notifications switches each category (high-risk, stalls, UC, overdue) on or off. The list filters immediately.";
        }
        return `${reviewCount} flags need review (${highCount} high-risk). Start with the high-risk rows at the top.`;
      },
    };
  }

  if (clean === "/dashboard/settings") {
    const summary = `Settings: jurisdiction scope, review-log export, notification preferences, and workspace reset.`;
    const chips = ["What scope am I in?", "How do I export my reviews?", "Is this real authentication?"] as const;
    return {
      contextTitle: "Settings — officer and preferences",
      summary,
      chips,
      answer: (question: string) => {
        if (question === "What scope am I in?") {
          return "Jurisdiction cards switch District (Bhopal), State (MP), or Ministry (all states) with live demo counts. The lens scopes every queue, map, and dossier count.";
        }
        if (question === "How do I export my reviews?") {
          return "The review-log card lists your recorded decisions with an Export CSV button — the audit trail to take out of the demo.";
        }
        return "Sign-in is a demo cookie for the prototype — any valid-shaped credentials work. Real sessions arrive with the Python backend.";
      },
    };
  }

  const fallback = `NIRIKSHAN-AI: ${MPLADS_KPIS.totalWorks.toLocaleString("en-IN")} works · ${MPLADS_KPIS.highRisk} high-risk · ${MPLADS_KPIS.delayed} delayed. Use Overview to triage, Works to filter, and a dossier to verify.`;
  return {
    contextTitle: "Dashboard — NIRIKSHAN-AI",
    summary: fallback,
    chips: ["What needs attention?", "Where do I start?", "What is NIRIKSHAN-AI?"],
    answer: (question: string) => {
      if (question === "Where do I start?") {
        return "Start at Overview (KPIs + map + 8-row queue), filter in Works, then verify one dossier: anomalies, evidence, assistant, decision.";
      }
      if (question === "What is NIRIKSHAN-AI?") {
        return "An investigation workspace: thousands of works become a prioritized, explainable case file. Flags mean needs review, never fraud.";
      }
      return fallback;
    },
  };
}

const ASSISTANT_STORAGE_KEY = "mplads-assistant-v1";

const MAX_STORED = 20;

function isAiMessage(item: unknown): item is AiMessage {
  if (typeof item !== "object" || item === null) {
    return false;
  }
  const record = item as Record<string, unknown>;
  return (
    typeof record.id === "number" &&
    (record.role === "user" || record.role === "assistant") &&
    typeof record.text === "string"
  );
}

function readStored(storageKey: string): AiMessage[] | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(`${ASSISTANT_STORAGE_KEY}:${storageKey}`);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }
    const valid = (parsed as unknown[]).filter(isAiMessage);
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

function AiPanel({
  messages,
  chips,
  onAsk,
}: {
  messages: AiMessage[];
  chips: readonly string[];
  onAsk: (question: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function submit(question: string) {
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }
    onAsk(trimmed);
    setDraft("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              message.role === "user"
                ? "self-end bg-primary text-primary-foreground"
                : "whitespace-pre-wrap bg-muted/60",
            )}
          >
            {message.text}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Badge
            key={chip}
            variant="outline"
            className="cursor-pointer hover:bg-muted"
            onClick={() => submit(chip)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                submit(chip);
              }
            }}
          >
            {chip}
          </Badge>
        ))}
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about this page…"
          aria-label="Ask the page assistant"
        />
        <Button type="submit" size="icon-sm" aria-label="Send question">
          <Send />
        </Button>
      </form>
      <p className="text-muted-foreground text-xs">Demo answers computed from page data.</p>
    </div>
  );
}

export function PageAssistant({ contextTitle, summary, chips, answer }: PageAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>(
    () => readStored(contextTitle) ?? [{ id: 0, role: "assistant", text: summary }],
  );
  const answerRef = useRef(answer);
  answerRef.current = answer;

  useEffect(() => {
    setMessages(readStored(contextTitle) ?? [{ id: 0, role: "assistant", text: summary }]);
  }, [contextTitle, summary]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `${ASSISTANT_STORAGE_KEY}:${contextTitle}`,
        JSON.stringify(messages.slice(-MAX_STORED)),
      );
    } catch {
      // Private mode: chat simply does not persist this session.
    }
  }, [messages, contextTitle]);

  const appendQuestion = useCallback((question: string) => {
    const id = Date.now();
    setMessages((current) => [
      ...current,
      { id, role: "user", text: question },
      { id: id + 1, role: "assistant", text: answerRef.current(question) },
    ]);
  }, []);

  function ask(question: string) {
    appendQuestion(question);
  }

  useEffect(() => {
    function onAskAi(event: Event) {
      const detail = (event as CustomEvent<{ question?: unknown }>).detail;
      if (typeof detail?.question !== "string" || detail.question.trim() === "") {
        return;
      }
      setOpen(true);
      appendQuestion(detail.question.trim());
    }
    window.addEventListener("mplads:ask-ai", onAskAi);
    return () => window.removeEventListener("mplads:ask-ai", onAskAi);
  }, [appendQuestion]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            className="fixed right-4 bottom-4 z-40 shadow-lg"
            size="sm"
            aria-label={`Open page assistant — ${contextTitle}`}
          />
        }
      >
        <Sparkles data-icon="inline-start" />
        Ask AI
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="flex h-[32rem] w-[min(24rem,calc(100vw-2rem))] flex-col p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="font-medium text-sm">Page assistant</p>
            <p className="truncate text-muted-foreground text-xs">{contextTitle}</p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close assistant" onClick={() => setOpen(false)}>
            <X />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
          <AiPanel messages={messages} chips={chips} onAsk={ask} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
