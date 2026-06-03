import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEmailCooldown, cooldownMessage, logDeletionAttempt } from "@/lib/cooldown";
import { toast } from "sonner";

/**
 * Global guard: if the authenticated session belongs to an email currently in
 * deletion cooldown, sign the user out immediately and surface the cooldown
 * message. Covers Email, Google, and Apple sign-in callbacks.
 */
export function CooldownGuard() {
  useEffect(() => {
    const check = async (email: string | null | undefined, provider: string) => {
      if (!email) return;
      const until = await getEmailCooldown(email);
      if (until) {
        await logDeletionAttempt(email, provider, "blocked_cooldown");
        await supabase.auth.signOut();
        try {
          sessionStorage.setItem("cooldown:msg", cooldownMessage(until));
          sessionStorage.setItem("cooldown:until", String(until));
        } catch {
          // ignore
        }
        toast.error(cooldownMessage(until), { duration: 10000 });
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.replace("/login?cooldown=1");
        }
      }
    };

    // Initial session check (covers OAuth redirect landing)
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) {
        const provider = (u.app_metadata?.provider as string) || "email";
        check(u.email, provider);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const provider = (session.user.app_metadata?.provider as string) || "email";
        check(session.user.email, provider);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  return null;
}
