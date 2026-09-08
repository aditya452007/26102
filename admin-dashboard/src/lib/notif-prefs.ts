export type NotifKind = "high-risk" | "stall" | "uc" | "overdue";

export const NOTIF_KINDS: ReadonlyArray<{ readonly value: NotifKind; readonly label: string }> = [
  { value: "high-risk", label: "High-risk flags" },
  { value: "stall", label: "Stall reminders" },
  { value: "uc", label: "UC pending" },
  { value: "overdue", label: "Past due dates" },
];

const PREFS_KEY = "mplads-notif-prefs-v1";

const READ_KEY = "mplads-notif-read-v1";

type Prefs = Record<NotifKind, boolean>;

const DEFAULTS: Prefs = { "high-risk": true, stall: true, uc: true, overdue: true };

function readJson(key: string): unknown {
  if (typeof window === "undefined") {
    return undefined;
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : undefined;
  } catch {
    return undefined;
  }
}

export function loadNotifPrefs(): Prefs {
  const parsed = readJson(PREFS_KEY);
  if (typeof parsed !== "object" || parsed === null) {
    return { ...DEFAULTS };
  }
  const record = parsed as Record<string, unknown>;
  return {
    "high-risk": typeof record["high-risk"] === "boolean" ? record["high-risk"] : DEFAULTS["high-risk"],
    stall: typeof record.stall === "boolean" ? record.stall : DEFAULTS.stall,
    uc: typeof record.uc === "boolean" ? record.uc : DEFAULTS.uc,
    overdue: typeof record.overdue === "boolean" ? record.overdue : DEFAULTS.overdue,
  };
}

export function saveNotifPrefs(prefs: Prefs): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Private mode: preferences simply do not persist this session.
  }
}

export function loadReadIds(): Set<string> {
  const parsed = readJson(READ_KEY);
  return Array.isArray(parsed) ? new Set(parsed.filter((id): id is string => typeof id === "string")) : new Set();
}

export function saveReadIds(ids: ReadonlySet<string>): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    // Private mode: read state simply does not persist this session.
  }
}
