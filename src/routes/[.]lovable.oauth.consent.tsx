import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

// Minimal typed wrapper for the beta `auth.oauth` namespace.
type AuthorizationDetails = {
  client?: { name?: string; redirect_uri?: string } | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};
type OAuthResult<T> = { data: T | null; error: { message: string } | null };
type SupabaseOAuth = {
  auth: {
    oauth: {
      getAuthorizationDetails: (id: string) => Promise<OAuthResult<AuthorizationDetails>>;
      approveAuthorization: (
        id: string,
      ) => Promise<OAuthResult<{ redirect_url?: string; redirect_to?: string }>>;
      denyAuthorization: (
        id: string,
      ) => Promise<OAuthResult<{ redirect_url?: string; redirect_to?: string }>>;
    };
  };
};

function oauthClient() {
  return supabase as unknown as SupabaseOAuth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // The Supabase browser client reads its session from localStorage, which is
  // absent during SSR — without this, getSession() is null on the server and
  // signed-in users are bounced.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  loader: async ({ location }) => {
    const params = new URLSearchParams(location.search);
    const authorizationId = params.get("authorization_id");
    if (!authorizationId) {
      throw new Error("Missing authorization_id");
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return { authenticated: false as const, authorizationId };
    }
    const { data, error } = await oauthClient().auth.oauth.getAuthorizationDetails(
      authorizationId,
    );
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      throw redirect({ href: immediate });
    }
    return { authenticated: true as const, authorizationId, details: data };
  },
  component: ConsentRoute,
  errorComponent: ({ error }) => (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="text-xl font-semibold">Could not load this authorization request</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function ConsentRoute() {
  const state = Route.useLoaderData();
  if (!state.authenticated) {
    return <SignInPrompt />;
  }
  return <ConsentPanel authorizationId={state.authorizationId} details={state.details} />;
}

function SignInPrompt() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const consentUrl =
    typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";

  const signInWithGoogle = async () => {
    setBusy(true);
    setErr(null);
    // Return to the consent URL after Google finishes so the same
    // authorization_id is consumed by the authenticated branch above.
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${consentUrl}`,
    });
    if (result.error) {
      setErr(result.error.message ?? "Sign-in failed");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold">Sign in to UNVEIL</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        You need to be signed in to approve this connection.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={signInWithGoogle}
        className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-border bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
      >
        Continue with Google
      </button>
      {err && <p className="mt-3 text-xs text-destructive">{err}</p>}
      <p className="mt-6 text-xs text-muted-foreground">
        Prefer email? <a className="underline" href={`/login?next=${encodeURIComponent(consentUrl)}`}>Sign in with email</a>
      </p>
    </main>
  );
}

function ConsentPanel({
  authorizationId,
  details,
}: {
  authorizationId: string;
  details?: AuthorizationDetails | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const decide = async (approve: boolean) => {
    setBusy(true);
    setError(null);
    const { data, error: err } = approve
      ? await oauthClient().auth.oauth.approveAuthorization(authorizationId)
      : await oauthClient().auth.oauth.denyAuthorization(authorizationId);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  };

  const clientName = details?.client?.name ?? "an app";
  const scopes = (details?.scope ?? "openid email profile")
    .split(/\s+/)
    .filter(Boolean);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">
          Connect {clientName} to UNVEIL
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {clientName} will be able to call UNVEIL's enabled tools while you are signed in.
        </p>
        {email && (
          <p className="mt-4 text-xs text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{email}</span>
          </p>
        )}
        <div className="mt-5 rounded-lg bg-muted/50 p-3 text-sm">
          <p className="font-medium">This connection will let {clientName}:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Read your basic UNVEIL profile</li>
            <li>Read your UNVEIL Journey progress</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            This does not bypass UNVEIL's permissions or backend policies.
          </p>
        </div>
        {scopes.length > 0 && (
          <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            Scopes: {scopes.join(" ")}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Cancel connection
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "Working…" : "Approve"}
          </button>
        </div>
      </div>
    </main>
  );
}
