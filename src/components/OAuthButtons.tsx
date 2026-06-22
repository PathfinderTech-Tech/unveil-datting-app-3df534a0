import { lovable } from "@/integrations/lovable";
import { useState } from "react";

export function OAuthButtons({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const signIn = async (provider: "google" | "apple") => {
    setBusy(provider); setErr("");
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/matches`,
    });
    if (result.error) {
      setErr(result.error.message ?? "Sign-in failed");
      setBusy(null);
    }
  };

  const label = mode === "signin" ? "Continue" : "Sign up";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => signIn("google")}
        disabled={busy !== null}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
        {label} with Google
      </button>
      <button
        type="button"
        onClick={() => signIn("apple")}
        disabled={busy !== null}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-black/90 disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
        {label} with Apple
      </button>
      {err && <p className="text-center text-xs text-destructive">{err}</p>}
    </div>
  );
}

export function OrDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-3 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
      <span className="h-px flex-1 bg-border" /> {label} <span className="h-px flex-1 bg-border" />
    </div>
  );
}

