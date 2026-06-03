import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Users, AlertTriangle, Mail, Crown, ShieldCheck, CreditCard, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — UNVEIL" }] }),
  component: Admin,
});

type Tab = "waitlist" | "verifications" | "payments" | "reports" | "feedback";

function Admin() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("waitlist");
  const [stats, setStats] = useState({
    users: 0, waitlistTotal: 0, waitlistPending: 0, approved: 0, rejected: 0,
    pendingVerif: 0, premium: 0, reports: 0,
  });
  const [verifications, setVerifications] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const [u, wlt, wlp, wla, wlr, vp, r, p, v, pay, rep, wl, fb] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("waitlist").select("id", { count: "exact", head: true }),
      supabase.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
      supabase.from("reports").select("id", { count: "exact", head: true }),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).neq("tier", "free"),
      supabase.from("verification_requests").select("*").in("status", ["pending_review", "submitted", "approved", "rejected"]).order("submitted_at", { ascending: false }).limit(50),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("waitlist").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setStats({
      users: u.count || 0,
      waitlistTotal: wlt.count || 0,
      waitlistPending: wlp.count || 0,
      approved: wla.count || 0,
      rejected: wlr.count || 0,
      pendingVerif: vp.count || 0,
      premium: p.count || 0,
      reports: r.count || 0,
    });
    setVerifications(v.data || []);
    setPayments(pay.data || []);
    setReports(rep.data || []);
    setWaitlist(wl.data || []);
    setFeedback(fb.data || []);
  }

  async function reviewWaitlist(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    const patch: Record<string, unknown> = {
      status,
      reviewed_at: new Date().toISOString(),
    };
    if (status === "approved") patch.approved_at = new Date().toISOString();
    const { error } = await supabase.from("waitlist").update(patch).eq("id", id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Approved." : "Rejected.");
    await refresh();
  }

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      const admin = !!data;
      setIsAdmin(admin);
      if (admin) await refresh();
    })();
  }, [user]);

  async function review(id: string, userId: string, decision: "approved" | "rejected", notes?: string) {
    setBusyId(id);
    try {
      const { error: vErr } = await supabase
        .from("verification_requests")
        .update({
          status: decision,
          reviewer_notes: notes ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (vErr) throw vErr;

      if (decision === "approved") {
        const { error: pErr } = await supabase
          .from("profiles")
          .update({ verified: true, trust_score: 100, updated_at: new Date().toISOString() })
          .eq("id", userId);
        if (pErr) throw pErr;
      }
      toast.success(decision === "approved" ? "Approved." : "Rejected.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Gate message="Sign in to continue." cta="Sign in" to="/login" />;
  if (isAdmin === false) return <Gate message="This area is restricted to administrators." cta="Back home" to="/" />;

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-12">
        <h1 className="font-display text-3xl font-light md:text-4xl">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Verification, payments & moderation</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Users className="h-4 w-4" />} label="Users" value={stats.users} />
          <Stat icon={<ShieldCheck className="h-4 w-4" />} label="Pending verifications" value={stats.pending} />
          <Stat icon={<Crown className="h-4 w-4" />} label="Premium" value={stats.premium} />
          <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Reports" value={stats.reports} />
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-b border-border">
          {(["verifications", "payments", "reports"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-4 py-2 text-sm capitalize transition-colors ${
                tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
              {tab === t && <div className="absolute inset-x-0 -bottom-px h-0.5 bg-gradient-hero" />}
            </button>
          ))}
        </div>

        {tab === "verifications" && (
          <div className="mt-6 space-y-3">
            {verifications.length === 0 ? (
              <Empty label="No verification requests yet." />
            ) : (
              verifications.map((v) => (
                <div key={v.id} className="rounded-2xl border border-border bg-card p-4 md:p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-lg">
                          {v.legal_first_name} {v.legal_last_name}
                        </span>
                        <StatusPill status={v.status} />
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {v.id_type} · {v.country} · DOB {v.date_of_birth}
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                        user_id: {v.user_id?.slice(0, 8)} · submitted {v.submitted_at ? new Date(v.submitted_at).toLocaleString() : "—"}
                      </div>
                    </div>
                    {v.status === "pending_review" && (
                      <div className="flex gap-2">
                        <button
                          disabled={busyId === v.id}
                          onClick={() => review(v.id, v.user_id, "approved")}
                          className="inline-flex items-center gap-1 rounded-full bg-gradient-hero px-4 py-2 text-xs font-medium text-primary-foreground shadow-glow disabled:opacity-60"
                        >
                          {busyId === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Approve
                        </button>
                        <button
                          disabled={busyId === v.id}
                          onClick={() => {
                            const notes = window.prompt("Rejection reason (visible to user):");
                            if (notes !== null) review(v.id, v.user_id, "rejected", notes);
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-4 py-2 text-xs hover:bg-surface-2 disabled:opacity-60"
                        >
                          <X className="h-3 w-3" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <DocThumb title="Selfie" url={v.selfie_url} />
                    <DocThumb title="ID front" url={v.id_front_url} />
                    {v.id_back_url && <DocThumb title="ID back" url={v.id_back_url} />}
                  </div>
                  {v.reviewer_notes && (
                    <div className="mt-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
                      Reviewer notes: {v.reviewer_notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "payments" && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
            {payments.length === 0 ? (
              <Empty label="No payments yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-xs uppercase tracking-luxury text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Kind</th>
                      <th className="px-4 py-3 text-left">Price</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="px-4 py-3 capitalize">{p.kind?.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{p.price_id ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-mono">{(p.amount_cents / 100).toFixed(2)} {p.currency?.toUpperCase()}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">{p.status}</span></td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{p.user_id?.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "reports" && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
            {reports.length === 0 ? (
              <Empty label="No reports yet." />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs uppercase tracking-luxury text-muted-foreground">
                  <tr><th className="px-4 py-3 text-left">Reason</th><th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">When</th></tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-3">{r.reason}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.description?.slice(0, 80)}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">{r.status}</span></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 font-display text-3xl font-light">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending_review: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    rejected: "bg-red-500/15 text-red-400 border-red-500/30",
    submitted: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    draft: "bg-surface-2 text-muted-foreground border-border",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-luxury ${colors[status] ?? colors.draft}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function DocThumb({ title, url }: { title: string; url: string | null }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-2">
      <div className="mb-1 font-mono text-[9px] uppercase tracking-luxury text-muted-foreground">{title}</div>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <img src={url} alt={title} className="h-32 w-full rounded-md object-cover" />
        </a>
      ) : (
        <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">—</div>
      )}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="p-6 text-sm text-muted-foreground">{label}</p>;
}

function Gate({ message, cta, to }: { message: string; cta: string; to: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-muted-foreground">{message}</p>
      <Link to={to} className="rounded-full bg-gradient-hero px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow">{cta}</Link>
    </div>
  );
}
