import { MapPin } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatMoneyRs, works } from "@/lib/mplads-mock";

interface StateFunds {
  state: string;
  works: number;
  sanctioned: number;
  released: number;
}

function stateFunds(): StateFunds[] {
  const byState = new Map<string, StateFunds>();
  for (const w of works) {
    const entry = byState.get(w.state) ?? { state: w.state, works: 0, sanctioned: 0, released: 0 };
    entry.works += 1;
    entry.sanctioned += w.sanctionedRs;
    entry.released += w.expenditureRs;
    byState.set(w.state, entry);
  }
  return [...byState.values()].sort((a, b) => b.sanctioned - a.sanctioned);
}

const ranked = stateFunds();
const topStates = ranked.slice(0, 3);
const restStates = ranked.slice(3);
const stalled = works.filter((w) => w.status === "stalled").length;

export function Wallet() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal">Funds by state</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          {topStates.map((entry) => (
            <div key={entry.state} className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm leading-none">
                    {entry.state} • {entry.works} works
                  </span>
                </div>
                <span className="font-normal text-muted-foreground text-xs tabular-nums">
                  S {formatMoneyRs(entry.sanctioned)} • R {formatMoneyRs(entry.released)}
                </span>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background">
                <MapPin className="size-4" />
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex flex-col gap-4">
          {restStates.map((entry) => (
            <div key={entry.state} className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm leading-none">
                    {entry.state} • {entry.works} works
                  </span>
                </div>
                <span className="font-normal text-muted-foreground text-xs tabular-nums">
                  S {formatMoneyRs(entry.sanctioned)} • R {formatMoneyRs(entry.released)}
                </span>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background">
                <MapPin className="size-4" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-[10px] text-muted-foreground">
              Demo sample: <span className="text-foreground">{works.length} works · 6 states</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-1 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <span className="font-bold text-[9px] text-amber-500 uppercase tracking-widest">{stalled} stalled</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
