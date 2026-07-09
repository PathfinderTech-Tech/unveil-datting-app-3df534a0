import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/journey")({
  component: JourneyAlias,
});

function JourneyAlias() {
  return <Navigate to="/spark" replace />;
}
