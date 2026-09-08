import { createFileRoute, Outlet } from "@tanstack/react-router";

import { Command } from "lucide-react";

import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/(main)/auth/v2")({
  component: Layout,
});

function Layout() {
  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        <div className="relative order-2 hidden h-full rounded-3xl bg-primary lg:flex">
          <div className="absolute top-10 space-y-1 px-10 text-primary-foreground">
            <Command className="size-10" />
            <h1 className="font-medium text-2xl">MPLADS Sentinel</h1>
            <p className="text-sm">Prioritise. Explain. Verify. Decide.</p>
          </div>

          <div className="absolute bottom-10 flex w-full justify-between px-10">
            <div className="flex-1 space-y-1 text-primary-foreground">
              <h2 className="font-medium">Officer workspace</h2>
              <p className="text-sm">Triage flagged works, inspect evidence, and record decisions.</p>
            </div>
            <Separator orientation="vertical" className="mx-3 h-auto!" />
            <div className="flex-1 space-y-1 text-primary-foreground">
              <h2 className="font-medium">Demo access</h2>
              <p className="text-sm">Any valid email and 6+ character password signs in to the prototype.</p>
            </div>
          </div>
        </div>
        <div className="relative order-1 flex h-full">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
