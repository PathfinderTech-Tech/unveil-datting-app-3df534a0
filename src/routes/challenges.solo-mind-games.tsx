import { createFileRoute } from "@tanstack/react-router";
import { SoloMindGamesHub } from "@/routes/game";

export const Route = createFileRoute("/challenges/solo-mind-games")({
  head: () => ({
    meta: [
      { title: "Solo Mind Games — UNVEIL" },
      {
        name: "description",
        content: "Play Free Your Mind & Heart from the Solo Mind Games hub.",
      },
    ],
  }),
  component: SoloMindGamesHub,
});
