import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark, LogoWordmark } from "@/components/LogoHeader";
import { OAuthButtons } from "@/components/OAuthButtons";
import { ArrowRight } from "lucide-react";

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    });
    setLoading(false);
    if (error) setErr(error.message);
    else {
      const { track } = await import("@/lib/analytics");
      await track("signup", { email });
      navigate({ to: "/onboarding" });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Link to="/" className="mb-10 flex flex-col items-center gap-3">
        <LogoMark size={64} />
        <LogoWordmark size={16} />
      </Link>
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card/80 p-8 backdrop-blur">
        <h1 className="font-display text-3xl font-light">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">UNVEIL is invite-only. Use the email you joined the waitlist with.</p>

        <div className="mt-3 rounded-xl border border-border bg-surface/50 px-3 py-2 text-[11px] text-muted-foreground">
          Don't have an invite yet? <Link to="/" className="text-foreground underline">Join the waitlist</Link>.
        </div>

        <div className="mt-6">
          <OAuthButtons mode="signup" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary" />
          <input type="password" required minLength={8} placeholder="Password (8+ chars)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary" />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button disabled={loading} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-hero px-6 py-3 font-medium text-primary-foreground shadow-glow disabled:opacity-50">
            {loading ? "Creating…" : <>Begin <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Already a member? <Link to="/login" className="text-foreground underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
