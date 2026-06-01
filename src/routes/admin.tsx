import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Users, AlertTriangle, Mail, Crown } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — UNVEIL" }] }),
  component: Admin,
});

function Admin() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ users: 0, reports: 0, waitlist: 0, premium: 0 });
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      const admin = !!data;
      setIsAdmin(admin);
      if (!admin) return;
      const [u, r, w, p, rep] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("reports").select("id", { count: "exact", head: true }),
        supabase.from("waitlist").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).neq("tier", "free"),
        supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(20),
      ]);
      setStats({ users: u.count || 0, reports: r.count || 0, waitlist: w.count || 0, premium: p.count || 0 });
      setReports(rep.data || []);
    })();
  }, [user]);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Gate message="Sign in to continue." cta="Sign in" to="/login" />;
  if (isAdmin === false) return <Gate message="This area is restricted to administrators." cta="Back home" to="/" />;

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-4xl font-light">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Moderation & insights</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Users className="h-4 w-4" />} label="Users" value={stats.users} />
          <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Reports" value={stats.reports} />
          <Stat icon={<Mail className="h-4 w-4" />} label="Waitlist" value={stats.waitlist} />
          <Stat icon={<Crown className="h-4 w-4" />} label="Premium" value={stats.premium} />
        </div>

        <div className="mt-10">
          <h2 className="mb-3 font-display text-xl font-light">Recent reports</h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {reports.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No reports yet.</p>
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
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 font-display text-3xl font-light">{value}</div>
    </div>
  );
}

function Gate({ message, cta, to }: { message: string; cta: string; to: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-muted-foreground">{message}</p>
      <Link to={to} className="rounded-full bg-gradient-hero px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow">{cta}</Link>
    </div>
  );
}
