import { useState } from "react";

import { Link, useNavigate } from "@tanstack/react-router";

import { Building2, Download, Landmark, LogOut, MapPin, RotateCcw } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { DEMO_TODAY_ISO, MPLADS_STORAGE_KEY, works } from "@/lib/mplads-mock";
import { type Decision, decisionSchema, type OfficerRole } from "@/lib/mplads-schema";
import { loadNotifPrefs, NOTIF_KINDS, saveNotifPrefs, type NotifKind } from "@/lib/notif-prefs";
import { getInitials } from "@/lib/utils";
import { roleLabel, useRoleStore } from "@/stores/role/role-store";
import { useSessionStore } from "@/stores/session/session-store";

const SCOPE_CARDS: ReadonlyArray<{
  readonly value: OfficerRole;
  readonly title: string;
  readonly description: string;
  readonly icon: typeof MapPin;
  readonly count: number;
}> = [
  {
    value: "district",
    title: "District — Bhopal",
    description: "Field-level triage. Only works in your district.",
    icon: MapPin,
    count: works.filter((work) => work.district === "Bhopal").length,
  },
  {
    value: "state",
    title: "State — MP",
    description: "Nodal oversight. Every work in Madhya Pradesh.",
    icon: Building2,
    count: works.filter((work) => work.state === "Madhya Pradesh").length,
  },
  {
    value: "ministry",
    title: "Ministry — All states",
    description: "National picture. The full demo scheme.",
    icon: Landmark,
    count: works.length,
  },
];

function OfficerCard() {
  const navigate = useNavigate();
  const email = useSessionStore((state) => state.email);
  const signOut = useSessionStore((state) => state.signOut);
  const role = useRoleStore((state) => state.role);

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/auth/v2/login", replace: true });
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Officer</CardTitle>
        <CardDescription>Signed in for this demo session.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Avatar className="size-10 rounded-lg">
          <AvatarFallback>{getInitials(email ?? "Officer")}</AvatarFallback>
        </Avatar>
        <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
          <span className="truncate font-medium">{email ?? "Officer"}</span>
          <span className="truncate text-muted-foreground text-xs">{roleLabel(role)}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => void handleSignOut()}>
          <LogOut data-icon="inline-start" />
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}

function JurisdictionCard() {
  const role = useRoleStore((state) => state.role);
  const setRole = useRoleStore((state) => state.setRole);

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Jurisdiction</CardTitle>
        <CardDescription>Your lens scopes every queue, map, and dossier count.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {SCOPE_CARDS.map((scope) => {
          const active = role === scope.value;
          const Icon = scope.icon;
          return (
            <button
              key={scope.value}
              type="button"
              onClick={() => setRole(scope.value)}
              aria-pressed={active}
              className={
                active
                  ? "flex flex-col gap-1 rounded-xl border border-primary/40 bg-primary/5 p-4 text-left"
                  : "flex flex-col gap-1 rounded-xl border p-4 text-left hover:bg-muted/60"
              }
            >
              <Icon className="size-4 text-muted-foreground" />
              <span className="font-medium text-sm">{scope.title}</span>
              <span className="text-muted-foreground text-xs">{scope.description}</span>
              <span className="mt-1 font-heading text-2xl tabular-nums tracking-tight">{scope.count}</span>
              <span className="text-muted-foreground text-xs">demo works in scope</span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function readDecisions(): Decision[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(MPLADS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return [];
    }
    return Object.values(parsed as Record<string, unknown>).flatMap((value) => {
      const result = decisionSchema.safeParse(value);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
}

function decisionsCsv(rows: Decision[]): string {
  const escape = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
  const lines = ["work_id,status,decided_by,decided_at,note"];
  for (const row of rows) {
    lines.push([row.workId, row.status, row.by, row.at, row.note].map(escape).join(","));
  }
  return lines.join("\n");
}

function ReviewLogCard() {
  const decisions = readDecisions();

  function handleExport() {
    const blob = new Blob([decisionsCsv(decisions)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mplads-review-log.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Review log</CardTitle>
        <CardDescription>
          {decisions.length === 0
            ? "Every Verified / Dismissed / Action Required lands here."
            : `${decisions.length} decision${decisions.length === 1 ? "" : "s"} recorded.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {decisions.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Download />
              </EmptyMedia>
              <EmptyTitle>No decisions yet</EmptyTitle>
              <EmptyDescription>Verify a dossier first — then export the audit trail.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              {decisions.slice(0, 3).map((decision) => (
                <div key={`${decision.workId}-${decision.at}`} className="flex items-center justify-between gap-2 text-sm">
                  <Button
                    nativeButton={false}
                    render={
                      <Link
                        to="/dashboard/works/$workId"
                        params={{ workId: decision.workId }}
                        search={{ tab: "activity", view: "grid", lens: "all", state: "", district: "", type: "", q: "" }}
                      />
                    }
                    variant="link"
                    className="h-auto p-0 font-medium"
                  >
                    {decision.workId}
                  </Button>
                  <span className="text-muted-foreground text-xs capitalize">{decision.status.replace("-", " ")}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-fit" onClick={handleExport}>
              <Download data-icon="inline-start" />
              Export CSV
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const WORKSPACE_KEYS = ["mplads-demo-v1", "mplads-notif-prefs-v1", "mplads-notif-read-v1", "mplads-assistant-v1"];

function WorkspaceCard() {
  function handleReset() {
    try {
      for (const key of WORKSPACE_KEYS) {
        window.localStorage.removeItem(key);
      }
      for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
        const key = window.localStorage.key(index);
        if (key?.startsWith("mplads-assistant-v1:")) {
          window.localStorage.removeItem(key);
        }
      }
    } catch {
      // Private mode: nothing persisted, nothing to clear.
    }
    window.location.reload();
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Workspace</CardTitle>
        <CardDescription>Reset decisions, read state, and assistant threads for a fresh demo run.</CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="outline" size="sm">
                <RotateCcw data-icon="inline-start" />
                Reset demo data
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset the demo workspace?</AlertDialogTitle>
              <AlertDialogDescription>
                This clears recorded decisions, notification read state, preferences, and assistant threads in this
                browser. Your sign-in stays.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>Reset everything</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function NotificationPrefsCard() {
  const [prefs, setPrefs] = useState(() => loadNotifPrefs());

  function toggle(kind: NotifKind, value: boolean) {
    const next = { ...prefs, [kind]: value };
    setPrefs(next);
    saveNotifPrefs(next);
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Notifications</CardTitle>
        <CardDescription>Choose which attention items appear on the Notifications page.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {NOTIF_KINDS.map((kind, index) => (
          <div key={kind.value}>
            {index > 0 && <Separator className="my-3" />}
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm">
                <p className="font-normal">{kind.label}</p>
              </div>
              <Switch
                checked={prefs[kind.value]}
                onCheckedChange={(value) => toggle(kind.value, Boolean(value))}
                aria-label={kind.label}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SettingsSections() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Who you operate as, what you hear about, and what you take out.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="flex flex-col gap-4 xl:col-span-7">
          <JurisdictionCard />
          <ReviewLogCard />
        </div>
        <div className="flex flex-col gap-4 xl:col-span-5">
          <OfficerCard />
          <NotificationPrefsCard />
          <WorkspaceCard />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        Prototype on bundled demo data frozen at {DEMO_TODAY_ISO} — sign-in is a demo cookie until the Python backend
        lands.
      </p>
    </div>
  );
}
