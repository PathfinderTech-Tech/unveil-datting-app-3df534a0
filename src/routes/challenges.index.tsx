import { createFileRoute, redirect } from "@tanstack/react-router";

type SearchParams = { u?: string; cat?: string };

export const Route = createFileRoute("/challenges/")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    u: typeof s.u === "string" ? s.u : undefined,
    cat: typeof s.cat === "string" ? s.cat : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/games", search: { cat: search.cat, u: search.u } });
  },
});
