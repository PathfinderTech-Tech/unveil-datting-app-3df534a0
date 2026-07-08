import { Suspense, lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RouteErrorScreen } from "@/components/RouteErrorScreen";
import { UnveilNav } from "@/components/UnveilNav";

const FreeYourMindHeartGame = lazy(async () => {
  const module = await import("@/components/games/FreeYourMindHeartGame");
  return { default: module.FreeYourMindHeartGame };
});

export const Route = createFileRoute("/challenges/free-your-mind-heart")({
  head: () => ({
    meta: [
      { title: "Free Your Mind & Heart — UNVEIL Challenges" },
      {
        name: "description",
        content:
          "Clear the paths and guide both arrows to set both free. Complete all five levels.",
      },
    ],
  }),
  errorComponent: ({ error }) => (
    <RouteErrorScreen
      title="Free Your Mind & Heart is temporarily unavailable"
      message="This challenge failed on this screen only. The rest of UNVEIL remains available."
      homeTo="/game"
      error={error}
    />
  ),
  component: FreeMindHeartRoute,
});

function FreeMindHeartRoute() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <FreeYourMindHeartGame />
    </Suspense>
  );
}

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Solo Mind Games
        </div>
        <h1 className="mt-3 font-display text-3xl">Loading Free Your Mind & Heart</h1>
        <p className="mt-2 text-sm text-muted-foreground">Preparing level data and controls.</p>
      </div>
    </div>
  );
}
