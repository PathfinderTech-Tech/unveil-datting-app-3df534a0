import { createFileRoute, redirect } from "@tanstack/react-router";

// Paid Verified Badge has been retired. Selfie/photo onboarding is the trust check.
// Anyone hitting /verify is sent to the Photo Studio instead.
export const Route = createFileRoute("/verify")({
  beforeLoad: () => {
    throw redirect({ to: "/avatar" });
  },
  component: () => null,
});
