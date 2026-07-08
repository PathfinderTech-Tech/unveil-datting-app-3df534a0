import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const ONBOARDING_CHECK_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("onboarding check timeout")), ms);
    }),
  ]);
}

/**
 * Hard-redirect guard for any route that should be locked until onboarding
 * is complete. Use at the top of a protected page component:
 *
 *   const { checking } = useRequireOnboarding();
 *   if (checking) return <LoadingScreen />;
 *
 * If the user is not signed in we send them to /login. If signed in but
 * onboarding is incomplete, we send them to /onboarding so they always
 * resume the flow instead of landing on a half-empty Discover/Matches/etc.
 */
export function useRequireOnboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      setChecking(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const { data } = await withTimeout(
          supabase
            .from("profiles")
            .select("onboarding_complete")
            .eq("id", user.id)
            .maybeSingle(),
          ONBOARDING_CHECK_TIMEOUT_MS,
        );
        if (!alive) return;
        if (!data?.onboarding_complete) {
          navigate({ to: "/onboarding", replace: true });
          return;
        }
      } catch (error) {
        console.warn("[onboarding-gate] check failed; allowing route render", error);
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, loading, navigate]);

  return { checking };
}
