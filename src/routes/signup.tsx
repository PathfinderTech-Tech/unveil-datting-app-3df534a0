import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark, LogoWordmark } from "@/components/LogoHeader";
import { OAuthButtons, OrDivider } from "@/components/OAuthButtons";
import { PhoneAuthForm } from "@/components/PhoneAuthForm";
import { ArrowRight } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { OfflineScreen } from "@/components/AppStateScreen";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Join UNVEIL" }, { name: "description", content: "Create your UNVEIL account." }] }),
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr("");
    const { getEmailCooldown, cooldownMessage, logDeletionAttempt } = await import("@/lib/cooldown");
    const until = await getEmailCooldown(email);
    if (until) {
      await logDeletionAttempt(email, "email", "blocked_cooldown");
      setErr(cooldownMessage(until));
      setLoading(false);
      return;
    }
    let error: { message: string } | null = null;
    try {
      const res = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/onboarding` },
      });
      error = res.error;
    } catch {
      error = { message: "Supabase error: account creation failed." };
    }
    setLoading(false);
    if (error) {
      const msg = error.message || "";
      if (msg.includes("ACCOUNT_DELETION_COOLDOWN")) {
        setErr("You recently deleted this account. You can create a new account again after 24 hours. Need help? Contact support@unveil.best");
      } else {
        setErr(msg);
      }
    } else {
      const { track } = await import("@/lib/analytics");
      await track("signup", { email });
      navigate({ to: "/onboarding" });
    }
  };

  if (isOffline) {
    return <OfflineScreen onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Link to="/" className="mb-10 flex flex-col items-center gap-3">
        <LogoMark size={64} />
        <LogoWordmark size={16} />
      </Link>
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card/80 p-8 backdrop-blur">
        <h1 className="font-display text-3xl font-light">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Join UNVEIL and start discovering meaningful connections.</p>


        <div className="mt-6">
          <PhoneAuthForm mode="signup" />
        </div>

        <OrDivider label="or continue with" />

        <OAuthButtons mode="signup" />

        <OrDivider label="email" />

        <form onSubmit={submit} className="space-y-3">
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary" />
          <PasswordInput required minLength={8} placeholder="Password (8+ chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button disabled={loading} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface px-6 py-3 font-medium text-foreground disabled:opacity-50">
            {loading ? "Creating…" : <>Sign up with Email <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Already a member? <Link to="/login" className="text-foreground underline">Sign in</Link>
        </p>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          By creating an account you confirm you are 18+ and agree to our{" "}
          <Link to="/terms" className="underline hover:text-foreground">Terms</Link>,{" "}
          <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>, and{" "}
          <Link to="/community-guidelines" className="underline hover:text-foreground">Community Guidelines</Link>.
        </p>
      </div>
    </div>
  );
}
