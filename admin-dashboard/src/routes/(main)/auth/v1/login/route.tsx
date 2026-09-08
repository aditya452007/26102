import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(main)/auth/v1/login")({
  beforeLoad: () => {
    // v1 is retired; v2 is the default officer login. Kept as a compat shim.
    throw redirect({ to: "/auth/v2/login", replace: true });
  },
});
