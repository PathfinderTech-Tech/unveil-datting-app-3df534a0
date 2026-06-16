import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RevealState = {
  loading: boolean;
  meaningful: number;
  voiceMe: number;
  voicePeer: number;
  activeDays: number;
  sharedActivities: number;
  veilLifted: boolean;
  veilLiftedAt: string | null;
  dateUnlocked: boolean;
  sponsorPreference: "sponsor" | "split" | "decide_together" | null;
};

const EMPTY: RevealState = {
  loading: true,
  meaningful: 0,
  voiceMe: 0,
  voicePeer: 0,
  activeDays: 0,
  sharedActivities: 0,
  veilLifted: false,
  veilLiftedAt: null,
  dateUnlocked: false,
  sponsorPreference: null,
};

/**
 * Tracks the reveal-journey state for a given peer.
 * Reads the caller's own `matches` row (user_id = me, matched_user_id = peer)
 * so `voice_notes_user` always means "voice notes the current user sent".
 */
export function useMatchReveal(peerUserId: string | null | undefined) {
  const [state, setState] = useState<RevealState>(EMPTY);

  useEffect(() => {
    if (!peerUserId) { setState(EMPTY); return; }
    let alive = true;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (alive) setState({ ...EMPTY, loading: false }); return; }

      const { data } = await supabase
        .from("matches")
        .select(
          "meaningful_interactions, voice_notes_user, voice_notes_peer, veil_lifted_at, active_day_count, shared_activity_count, date_unlocked_at, sponsor_preference"
        )
        .eq("user_id", user.id)
        .eq("matched_user_id", peerUserId as string)
        .maybeSingle();

      if (!alive) return;
      const r = (data ?? {}) as any;
      setState({
        loading: false,
        meaningful: r.meaningful_interactions ?? 0,
        voiceMe: r.voice_notes_user ?? 0,
        voicePeer: r.voice_notes_peer ?? 0,
        activeDays: r.active_day_count ?? 0,
        sharedActivities: r.shared_activity_count ?? 0,
        veilLifted: !!r.veil_lifted_at,
        veilLiftedAt: r.veil_lifted_at ?? null,
        dateUnlocked: !!r.date_unlocked_at,
        sponsorPreference: (r.sponsor_preference ?? null) as RevealState["sponsorPreference"],
      });
    }

    load();
    const channel = supabase
      .channel(`reveal-${peerUserId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "matches" },
        load as any,
      )
      .subscribe();

    return () => { alive = false; supabase.removeChannel(channel); };
  }, [peerUserId]);

  return state;
}

export async function setSponsorPreference(
  peerUserId: string,
  pref: "sponsor" | "split" | "decide_together" | null,
) {
  const { error } = await (supabase as any).rpc("set_sponsor_preference", {
    _peer: peerUserId,
    _pref: pref,
  });
  if (error) throw error;
}
