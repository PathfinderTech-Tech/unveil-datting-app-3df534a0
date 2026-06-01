import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/LogoHeader";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — UNVEIL" }] }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // when arriving via recovery link, supabase sets a session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMsg(error.message);
    else { setMsg("Updated. Redirecting…"); setTimeout(() => navigate({ to: "/login" }), 1500); }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <LogoMark size={64} className="mb-10" />
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card/80 p-8 backdrop-blur">
        <h1 className="font-display text-3xl font-light">Reset password</h1>
        {!ready ? (
          <p className="mt-3 text-sm text-muted-foreground">Open the recovery link from your email to continue.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input type="password" required minLength={8} placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary" />
            <button className="w-full rounded-full bg-gradient-hero px-6 py-3 font-medium text-primary-foreground shadow-glow">Update password</button>
          </form>
        )}
        {msg && <p className="mt-3 text-xs text-muted-foreground">{msg}</p>}
      </div>
    </div>
  );
}
