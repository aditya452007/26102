import { createFileRoute } from "@tanstack/react-router";

import { NotificationsList } from "./-components/notifications-list";

export const Route = createFileRoute("/(main)/dashboard/notifications")({
  component: Page,
});

function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <NotificationsList />
    </div>
  );
}
