import type { CSSProperties } from "react";
import { useEffect } from "react";

import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";

import { cn } from "cn";

import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { users } from "@/data/users";
import { getDashboardLayout, getValueFromCookie } from "@/server/server-actions";
import { parseRole, ROLE_COOKIE_KEY } from "@/stores/role/role-store";
import { OFFICER_COOKIE_KEY, SESSION_COOKIE_KEY, useSessionStore } from "@/stores/session/session-store";

import { AccountSwitcher } from "./-components/header/account-switcher";
import { GitHubRepositoriesMenu } from "./-components/header/github-repositories-menu";
import { LayoutControls } from "./-components/header/layout-controls";
import { RoleSwitcher } from "./-components/header/role-switcher";
import { SearchDialog } from "./-components/header/search-dialog";
import { ThemeSwitcher } from "./-components/header/theme-switcher";
import { PageAssistant, resolvePageContext } from "./-components/page-assistant";
import { AppSidebar } from "./-components/sidebar/app-sidebar";

export const Route = createFileRoute("/(main)/dashboard")({
  beforeLoad: async ({ location }) => {
    const session = await getValueFromCookie(SESSION_COOKIE_KEY);
    if (!session) {
      throw redirect({ to: "/auth/v2/login", search: { redirect: location.href }, replace: true });
    }
  },
  loader: async () => {
    const layout = await getDashboardLayout();
    return {
      ...layout,
      role: parseRole(await getValueFromCookie(ROLE_COOKIE_KEY)),
      officerEmail: (await getValueFromCookie(OFFICER_COOKIE_KEY)) ?? "",
    };
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const { defaultOpen, variant, collapsible, role, officerEmail } = Route.useLoaderData();
  const hydrateSession = useSessionStore((state) => state.hydrate);
  useEffect(() => {
    hydrateSession(officerEmail || null);
  }, [hydrateSession, officerEmail]);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const assistant = resolvePageContext(pathname);

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 68)",
        } as CSSProperties
      }
    >
      <AppSidebar variant={variant} collapsible={collapsible} />
      <SidebarInset
        className={cn(
          "[html[data-content-layout=centered]_&>*]:mx-auto",
          "[html[data-content-layout=centered]_&>*]:w-full",
          "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
          "peer-data-[variant=inset]:border",
          "[--dashboard-header-height:--spacing(12)]",
          "min-w-0 overflow-x-clip",
        )}
      >
        <header
          className={cn(
            "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
            // Handle sticky navbar style with conditional classes so blur, background, z-index, and rounded corners remain consistent across all SidebarVariant layouts.
            "[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit] [html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:backdrop-blur-md",
          )}
        >
          <div className="flex w-full items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
              />
              <SearchDialog />
            </div>
            <div className="flex items-center gap-2">
              <LayoutControls />
              <ThemeSwitcher />
              <GitHubRepositoriesMenu />
              <RoleSwitcher initialRole={role} />
              <AccountSwitcher users={users} />
            </div>
          </div>
        </header>
        {/* Pages can set data-content-padding="false" to render full-bleed app layouts. */}
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 has-data-[content-padding=false]:p-0 md:p-6 md:has-data-[content-padding=false]:p-0">
          <Outlet />
        </div>
      </SidebarInset>
      <PageAssistant
        contextTitle={assistant.contextTitle}
        summary={assistant.summary}
        chips={assistant.chips}
        answer={assistant.answer}
      />
    </SidebarProvider>
  );
}
