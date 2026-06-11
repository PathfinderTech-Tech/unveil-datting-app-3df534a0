import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark, LogoWordmark } from "@/components/LogoHeader";
import { OAuthButtons } from "@/components/OAuthButtons";
import { ArrowRight } from "lucide-react";
import { getEmailCooldown, cooldownMessage, logDeletionAttempt } from "@/lib/cooldown";
import { PasswordInput } from "@/components/ui/password-input";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "UNVEIL — Sign in" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [cooldownBanner, setCooldownBanner] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cooldown") === "1") {
      const msg = sessionStorage.getItem("cooldown:msg");
      if (msg) setCooldownBanner(msg);
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr("");
    const until = await getEmailCooldown(email);
    if (until) {
      await logDeletionAttempt(email, "email", "blocked_cooldown");
      setErr(cooldownMessage(until));
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setErr(error.message);
    else navigate({ to: "/matches" });
  };

  const forgot = async () => {
    if (!email) { setErr("Enter your email first"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setErr(error.message);
    else setErr("Check your email for the reset link.");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Link to="/" className="mb-10 flex flex-col items-center gap-3">
        <LogoMark size={64} />
        <LogoWordmark size={16} />
      </Link>
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card/80 p-8 backdrop-blur">
        <h1 className="font-display text-3xl font-light">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Continue your discovery.</p>
        {cooldownBanner && (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {cooldownBanner}{" "}
            <Link to="/support" className="underline">Contact support</Link>
          </div>
        )}

        <div className="mt-6">
          <OAuthButtons mode="signin" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary" />
          <PasswordInput required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button disabled={loading} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-hero px-6 py-3 font-medium text-primary-foreground shadow-glow disabled:opacity-50">
            {loading ? "Signing in…" : <>Sign in <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
        <div className="mt-4 flex justify-between text-xs text-muted-foreground">
          <button onClick={forgot} className="underline">Forgot password?</button>
          <Link to="/signup">Create account</Link>
        </div>
        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          By continuing you agree to our{" "}
          <Link to="/terms" className="underline hover:text-foreground">Terms</Link>,{" "}
          <Link to="/privacy" className="underline hover:text-foreground">Privacy</Link>, and{" "}
          <Link to="/community-guidelines" className="underline hover:text-foreground">Community Guidelines</Link>.
        </p>
      </div>
    </div>
  );
}
