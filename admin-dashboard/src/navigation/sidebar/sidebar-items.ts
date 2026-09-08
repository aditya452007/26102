import {
  Banknote,
  Bell,
  Calendar,
  CheckSquare,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  ListTodo,
  type LucideIcon,
  ReceiptText,
  Settings,
  Sparkles,
} from "lucide-react";

import type { FileRoutesByTo } from "@/routeTree.gen";

export type NavBadge = "new" | "soon";
export type AppPath = keyof FileRoutesByTo;

export interface NavSubItem {
  id: string;
  title: string;
  url: AppPath;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: AppPath;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "MPLADS",
    items: [
      {
        id: "overview",
        title: "Overview",
        url: "/dashboard/overview",
        icon: LayoutDashboard,
      },
      {
        id: "works",
        title: "Works",
        url: "/dashboard/works",
        icon: ListTodo,
      },
      {
        id: "finance",
        title: "Fund Flow",
        url: "/dashboard/finance",
        icon: Banknote,
      },
      {
        id: "analytics",
        title: "Performance",
        url: "/dashboard/analytics",
        icon: Gauge,
      },
      {
        id: "tasks",
        title: "Verifications",
        url: "/dashboard/tasks",
        icon: CheckSquare,
      },
      {
        id: "calendar",
        title: "Deadlines",
        url: "/dashboard/calendar",
        icon: Calendar,
      },
      {
        id: "file-manager",
        title: "Documents",
        url: "/dashboard/file-manager",
        icon: FolderOpen,
      },
      {
        id: "invoice",
        title: "UC Tracking",
        url: "/dashboard/invoice",
        icon: ReceiptText,
      },
      {
        id: "copilot",
        title: "AI Copilot",
        url: "/chat",
        icon: Sparkles,
      },
      {
        id: "notifications",
        title: "Notifications",
        url: "/dashboard/notifications",
        icon: Bell,
      },
      {
        id: "settings",
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];
