import { createFileRoute, redirect } from "@tanstack/react-router";

// Insights has been merged into AI Insights — the single unified
// Relationship Intelligence Hub. All previous links continue to work
// via this redirect.
export const Route = createFileRoute("/insights")({
  beforeLoad: () => {
    throw redirect({ to: "/insights-ai" });
  },
  component: () => null,
});
