import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfileForUser } from "@/lib/auth-profile-bootstrap";

const AUTH_BOOT_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("auth timeout")), ms);
    }),
  ]);
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!alive) return;
      setError(null);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        void ensureProfileForUser(s.user);
      }
      setLoading(false);
    });
    withTimeout(supabase.auth.getSession(), AUTH_BOOT_TIMEOUT_MS)
      .then(({ data: { session } }) => {
        if (!alive) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          void ensureProfileForUser(session.user);
        }
      })
      .catch(() => {
        if (!alive) return;
        setError("Unable to connect to authentication services.");
        setSession(null);
        setUser(null);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, loading, error };
}
