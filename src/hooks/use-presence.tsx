import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Global real-time presence.
 *
 * Every signed-in client joins a single Supabase Realtime channel
 * ("online-users") and tracks its own user id. The channel's presence
 * state gives every other client an authoritative live set of online
 * user ids — works across Discover, Matches, Messages, Profile and
 * Passport because the provider is mounted at the route root.
 *
 * Heuristic stays simple on purpose: "online" === in the presence set.
 * When a client closes the app, Supabase Realtime fires `leave` within
 * its heartbeat window (~30–60s) and every other client removes that
 * id. UI then falls back to `Active Xm ago` derived from `last_seen_at`.
 */
type PresenceCtx = {
  online: Set<string>;
  isOnline: (userId: string | null | undefined) => boolean;
};

const Ctx = createContext<PresenceCtx>({
  online: new Set(),
  isOnline: () => false,
});

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) {
      setOnline(new Set());
      return;
    }

    const channel = supabase.channel("online-users", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnline(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    // Re-track on tab visibility so backgrounded mobile browsers
    // re-announce promptly when the user returns to the app.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <Ctx.Provider value={{ online, isOnline: (id) => !!id && online.has(id) }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePresence() {
  return useContext(Ctx);
}

export function useIsOnline(userId: string | null | undefined) {
  return useContext(Ctx).isOnline(userId);
}
