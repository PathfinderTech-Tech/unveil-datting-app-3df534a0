import { useAuth } from "@/hooks/use-auth";
import { isReviewerEmail } from "@/lib/reviewer-mode";

/** Returns true when the signed-in user is the Apple App Review account. */
export function useIsReviewer(): boolean {
  const { user } = useAuth();
  return isReviewerEmail(user?.email ?? null);
}
