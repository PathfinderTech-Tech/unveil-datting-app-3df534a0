import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy deep link kept for reviewer safety.
export const Route = createFileRoute("/puzzles")({
  beforeLoad: () => {
    throw redirect({ to: "/games", replace: true });
  },
  component: () => null,
});
