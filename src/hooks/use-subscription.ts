import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubState = { isPremium: boolean; isVerified: boolean; loading: boolean };

export function useSubscription(): SubState {
  const [state, setState] = useState<SubState>({ isPremium: false, isVerified: false, loading: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (alive) setState({ isPremium: false, isVerified: false, loading: false }); return; }
      const [{ data: sub }, { data: prof }] = await Promise.all([
        supabase.from("subscriptions").select("status,current_period_end,environment")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("profiles").select("verified").eq("id", user.id).maybeSingle(),
      ]);
      const active = !!sub && ["active", "trialing"].includes(sub.status ?? "") &&
        (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
      if (alive) setState({ isPremium: active, isVerified: !!prof?.verified, loading: false });
    })();
    return () => { alive = false; };
  }, []);

  return state;
}
