import { createFileRoute } from "@tanstack/react-router";

import { SettingsSections } from "./-components/settings-sections";

export const Route = createFileRoute("/(main)/dashboard/settings")({
  component: Page,
});

function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SettingsSections />
    </div>
  );
}
