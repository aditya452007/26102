import { differenceInCalendarDays } from "date-fns";
import type { LucideIcon } from "lucide-react";
import { Flag, Inbox, MessageCircle, Sparkles } from "lucide-react";

import { anomalies, compareSentence, DEMO_TODAY_ISO, formatLakh, formatWorkDate, works } from "@/lib/mplads-mock";
import type { Anomaly } from "@/lib/mplads-schema";

import { answerCopilot, copilotGreeting } from "./copilot-brain";

export type Conversation = {
  id: number;
  group: "Pinned" | "Today" | "Yesterday";
  name: string;
  subject: string;
  preview: string;
  time: string;
  isUnread: boolean;
  isOnline: boolean;
  unreadCount: number;
  contact: Contact;
  messages: Message[];
};

export type Message = {
  id: number;
  align: "start" | "end";
  text: string;
  time: string;
  reaction?: string;
};

export type Contact = {
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  location: string;
  timezone: string;
  status: string;
  qualifiedAt: string;
  tags: string[];
};

export type NavItem = {
  id: string;
  title: string;
  label?: string;
  icon: LucideIcon;
  isActive: boolean;
};

export const COPILOT_ID = 1;

const SEVERITY_RANK: Record<Anomaly["severity"], number> = { high: 0, medium: 1, low: 2 };

function daysAgo(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const diff = differenceInCalendarDays(new Date(2026, 8, 7), new Date(y, m - 1, d));
  if (diff <= 0) {
    return "today";
  }
  if (diff === 1) {
    return "yesterday";
  }
  return `${diff}d ago`;
}

function threadExplanation(workId: string): string {
  const work = works.find((candidate) => candidate.id === workId);
  const flag = anomalies
    .filter((anomaly) => anomaly.workId === workId)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])[0];
  if (!work || !flag) {
    return "No open flags on this work in the demo data.";
  }
  const numbers =
    flag.actualLakh !== null && flag.peerMedianLakh !== null
      ? `${compareSentence(flag.actualLakh, flag.peerMedianLakh, flag.peerN, work.type, work.district)} `
      : "";
  return `${flag.headline} ${numbers}${flag.corroboration}`;
}

const copilotContact: Contact = {
  name: "NIRIKSHAN Copilot",
  role: "MPLADS review assistant",
  company: "MoSPI · SIH26102 demo",
  email: "copilot@example.com",
  phone: "—",
  website: "—",
  location: "All demo states",
  timezone: "IST (UTC+5:30)",
  status: "Online",
  qualifiedAt: DEMO_TODAY_ISO,
  tags: ["copilot", "demo"],
};

const copilotConversation: Conversation = {
  id: COPILOT_ID,
  group: "Pinned",
  name: "NIRIKSHAN Copilot",
  subject: "Ask about any flagged work",
  preview: "Why was W-1014 flagged? Which works are high-risk?",
  time: "now",
  isUnread: true,
  isOnline: true,
  unreadCount: 1,
  contact: copilotContact,
  messages: [
    { id: 101, align: "start", text: copilotGreeting(), time: "now" },
    { id: 102, align: "end", text: "Why was W-1014 flagged?", time: "now" },
    { id: 103, align: "start", text: answerCopilot("Why was W-1014 flagged?"), time: "now" },
  ],
};

const workThreads: Conversation[] = anomalies
  .map((anomaly, index): Conversation | null => {
    const work = works.find((candidate) => candidate.id === anomaly.workId);
    if (!work) {
      return null;
    }
    return {
      id: index + 2,
      group: anomaly.severity === "high" ? ("Today" as const) : ("Yesterday" as const),
      name: `#${work.id} · ${work.title}`,
      subject: anomaly.headline,
      preview: anomaly.corroboration,
      time: daysAgo(work.lastUpdate),
      isUnread: anomaly.severity === "high",
      isOnline: false,
      unreadCount: anomaly.severity === "high" ? 1 : 0,
      contact: {
        name: work.agency,
        role: "Implementing agency",
        company: work.department,
        email: "field-team@example.com",
        phone: "—",
        website: "—",
        location: `${work.district}, ${work.state}`,
        timezone: "IST (UTC+5:30)",
        status: `${anomaly.severity} risk`,
        qualifiedAt: formatWorkDate(work.sanctionDate),
        tags: [anomaly.kind, anomaly.severity, work.type],
      },
      messages: [
        {
          id: (index + 2) * 100 + 1,
          align: "start" as const,
          text: `Flag raised — needs review: ${anomaly.headline}`,
          time: daysAgo(work.lastUpdate),
        },
        {
          id: (index + 2) * 100 + 2,
          align: "start" as const,
          text: threadExplanation(work.id),
          time: daysAgo(work.lastUpdate),
        },
      ],
    } satisfies Conversation;
  })
  .filter((thread): thread is Conversation => thread !== null);

export const conversations: Conversation[] = [copilotConversation, ...workThreads];

export const navItems: NavItem[] = [
  { id: "copilot", title: "Copilot", icon: Sparkles, isActive: true },
  { id: "flagged", title: "Flagged works", label: `${anomalies.length}`, icon: Flag, isActive: false },
  { id: "threads", title: "All threads", label: `${conversations.length}`, icon: MessageCircle, isActive: false },
  { id: "inbox", title: "Decisions", icon: Inbox, isActive: false },
];

export const channelItems: NavItem[] = [];

export const viewItems: NavItem[] = [];

export const currentUser = {
  name: "Alex Carter",
  email: "alex.carter@example.com",
};

export function demoTotals(): { sanctioned: string; works: number; flags: number } {
  const sanctioned = works.reduce((total, work) => total + work.sanctionedLakh, 0);
  return { sanctioned: formatLakh(Math.round(sanctioned * 10) / 10), works: works.length, flags: anomalies.length };
}
