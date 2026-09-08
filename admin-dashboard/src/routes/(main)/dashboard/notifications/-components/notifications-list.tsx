import { useState } from "react";

import { Link } from "@tanstack/react-router";

import { BellRing, CalendarClock, FileWarning, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { loadNotifPrefs, loadReadIds, type NotifKind, saveReadIds } from "@/lib/notif-prefs";

import { buildNotifications, type OfficerNotification } from "./data";

const KIND_ICON: Record<NotifKind, typeof TriangleAlert> = {
  "high-risk": TriangleAlert,
  "stall": BellRing,
  "uc": FileWarning,
  "overdue": CalendarClock,
};

const KIND_LABEL: Record<NotifKind, string> = {
  "high-risk": "High-risk",
  "stall": "Stalled",
  "uc": "UC pending",
  "overdue": "Overdue",
};

function ageLabel(days: number): string {
  if (days <= 0) {
    return "today";
  }
  if (days === 1) {
    return "1d ago";
  }
  return `${days}d ago`;
}

function NotificationRow({
  row,
  unread,
  onOpen,
}: {
  row: OfficerNotification;
  unread: boolean;
  onOpen: (id: string) => void;
}) {
  const Icon = KIND_ICON[row.kind];
  return (
    <Item variant="outline" className="rounded-xl">
      <ItemMedia variant="icon">
        <Icon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          <span className="flex items-center gap-2">
            {unread && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
            {row.title}
          </span>
        </ItemTitle>
        <ItemDescription>
          {row.description} · {KIND_LABEL[row.kind]} · {ageLabel(row.ageDays)}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          nativeButton={false}
          render={
            <Link
              to="/dashboard/works/$workId"
              params={{ workId: row.workId }}
              search={{ tab: "overview", view: "grid", lens: "all", state: "", district: "", type: "", q: "" }}
            />
          }
          size="sm"
          variant="outline"
          onClick={() => onOpen(row.id)}
        >
          Open work
        </Button>
      </ItemActions>
    </Item>
  );
}

export function NotificationsList() {
  const [readIds, setReadIds] = useState<ReadonlySet<string>>(() => loadReadIds());
  const prefs = loadNotifPrefs();
  const rows = buildNotifications().filter((row) => prefs[row.kind]);
  const unread = rows.filter((row) => !readIds.has(row.id));

  function markOpen(id: string) {
    if (readIds.has(id)) {
      return;
    }
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    saveReadIds(next);
  }

  function markAllRead() {
    const next = new Set(readIds);
    for (const row of rows) {
      next.add(row.id);
    }
    setReadIds(next);
    saveReadIds(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm">
            {unread.length === 0
              ? "You're caught up — no unread attention items."
              : `${unread.length} unread attention item${unread.length === 1 ? "" : "s"} from the demo dataset.`}
          </p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>
      {rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BellRing />
            </EmptyMedia>
            <EmptyTitle>No notifications for your preferences</EmptyTitle>
            <EmptyDescription>
              Every category is switched off in Settings, or nothing currently needs attention.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <NotificationRow key={row.id} row={row} unread={!readIds.has(row.id)} onOpen={markOpen} />
          ))}
        </div>
      )}
    </div>
  );
}
