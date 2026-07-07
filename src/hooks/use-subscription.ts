import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubState = { isPremium: boolean; isVerified: boolean; loading: boolean };

const SUBSCRIPTION_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("subscription timeout")), ms);
    }),
  ]);
}

export function useSubscription(): SubState {
  const [state, setState] = useState<SubState>({ isPremium: false, isVerified: false, loading: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: { user } } = await withTimeout(supabase.auth.getUser(), SUBSCRIPTION_TIMEOUT_MS);
        if (!user) {
          if (alive) setState({ isPremium: false, isVerified: false, loading: false });
          return;
        }
        const [{ data: sub }, { data: prof }] = await withTimeout(Promise.all([
          supabase.from("subscriptions").select("status,current_period_end,environment")
            .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("profiles").select("verified").eq("id", user.id).maybeSingle(),
        ]), SUBSCRIPTION_TIMEOUT_MS);
        const active = !!sub && ["active", "trialing"].includes(sub.status ?? "") &&
          (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
        if (alive) setState({ isPremium: active, isVerified: !!prof?.verified, loading: false });
      } catch (error) {
        console.warn("[subscription] fallback to free tier", error);
        if (alive) setState({ isPremium: false, isVerified: false, loading: false });
      }
    })();
    return () => { alive = false; };
  }, []);

  return state;
}
