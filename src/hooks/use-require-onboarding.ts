import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

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
      return;
    }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", user.id)
        .maybeSingle();
      if (!alive) return;
      if (!data?.onboarding_complete) {
        navigate({ to: "/onboarding", replace: true });
        return;
      }
      setChecking(false);
    })();
    return () => {
      alive = false;
    };
  }, [user, loading, navigate]);

  return { checking };
}
