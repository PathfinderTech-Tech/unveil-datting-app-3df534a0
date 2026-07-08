import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NearbyDiscoverySettings } from "@/components/NearbyDiscoverySettings";
import { TravelModeToggle } from "@/components/TravelModeToggle";
import { FeedbackForm } from "@/components/FeedbackForm";
import { useTranslation } from "react-i18next";
import { useMessageQuota, formatRemainingTime } from "@/hooks/use-message-quota";
import { useRequireOnboarding } from "@/hooks/use-require-onboarding";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { deleteAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Zap, Crown, AlertTriangle, Trash2, User, Shield, Bell, CreditCard, LifeBuoy, Settings as SettingsIcon,
  Mail, Phone as PhoneIcon, Key, LogIn, BadgeCheck, FlagOff, RefreshCw, Download, FileText,
} from "lucide-react";
import { RestorePurchasesButton } from "@/components/RestorePurchasesButton";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — UNVEIL" }] }),
  component: Settings,
});

const SECTIONS = [
  { id: "account", label: "Account", icon: User },
  { id: "privacy", label: "Privacy & Safety", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "membership", label: "Membership", icon: CreditCard },
  { id: "support", label: "Support", icon: LifeBuoy },
  { id: "management", label: "Account Management", icon: SettingsIcon },
] as const;

function Settings() {
  const { checking } = useRequireOnboarding();
  const { t } = useTranslation();
  const { quota } = useMessageQuota();
  const { user } = useAuth();
  const navigate = useNavigate();
  const deleteAccountFn = useServerFn(deleteAccount);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const passActive = !!quota.messagePassUntil && new Date(quota.messagePassUntil) > new Date();
  const premiumActive = !!quota.premiumUntil && new Date(quota.premiumUntil) > new Date();
  const isPhoneUser = !!(user && (user.phone || (user.email ?? "").endsWith("@phone.unveil.local")));
  const displayEmail = isPhoneUser ? "—" : (user?.email ?? "—");
  const displayPhone = user?.phone || (isPhoneUser ? (user?.user_metadata?.phone_number as string | undefined) ?? "—" : "—");

  async function handleDelete() {
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      toast.error('Type "DELETE" to confirm.');
      return;
    }
    setDeleting(true);
    try {
      const res = await deleteAccountFn();
      if ("error" in res) {
        toast.error(res.error);
        setDeleting(false);
        return;
      }
      await supabase.auth.signOut();
      toast.success("Account deleted. You can re-register in 24 hours.");
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account");
      setDeleting(false);
    }
  }

  function jumpTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (checking) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <div className="mx-auto max-w-md p-12 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-2xl px-5 py-10 md:py-14">
        <h1 className="font-display text-3xl font-light md:text-4xl">{t("common.settings")}</h1>

        {/* Section nav */}
        <nav aria-label="Settings sections" className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => jumpTo(s.id)}
              className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card/60 px-2 py-2 text-[10px] text-foreground/80 hover:bg-card"
            >
              <s.icon className="h-4 w-4 text-primary" />
              <span className="text-center leading-tight">{s.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-8 space-y-8">
          {/* ====================== ACCOUNT ====================== */}
          <Group id="account" icon={User} title="Account">
            <Card>
              <Row label="Profile" hint="View and edit your public profile">
                <Link to="/profile" className="link-pill">Open profile</Link>
              </Row>
              <Row label="Personal information" hint="Name, age, gender, country, intentions">
                <Link to="/onboarding" search={{ edit: 1 } as never} className="link-pill">Edit details</Link>
              </Row>
              <Row label="Phone number" hint={displayPhone}>
                <span className="muted-pill"><PhoneIcon className="h-3 w-3" /> {isPhoneUser ? "Phone login" : "—"}</span>
              </Row>
              <Row label="Email" hint={displayEmail}>
                <span className="muted-pill"><Mail className="h-3 w-3" /> {isPhoneUser ? "Phone account" : "Email login"}</span>
              </Row>
              <Row label="Password" hint={isPhoneUser ? "Not used with phone login" : "Reset via email"}>
                <Link to="/reset-password" className="link-pill"><Key className="h-3 w-3" /> Reset password</Link>
              </Row>
              <Row label="Login methods" hint="Phone, Apple, Google, Email">
                <span className="muted-pill"><LogIn className="h-3 w-3" /> Managed at sign-in</span>
              </Row>
            </Card>
          </Group>

          {/* ====================== PRIVACY & SAFETY ====================== */}
          <Group id="privacy" icon={Shield} title="Privacy & Safety">
            <NearbyDiscoverySettings />
            <TravelModeToggle />
            <Card>
              <Row label="Verification" hint="Selfie + photo verification">
                <Link to="/verify" className="link-pill"><BadgeCheck className="h-3 w-3" /> Manage verification</Link>
              </Row>
              <Row label="Blocked users" hint="People you've blocked are hidden everywhere">
                <span className="muted-pill">Unblock from any chat</span>
              </Row>
              <Row label="Report history" hint="Reports you've submitted">
                <span className="muted-pill"><FlagOff className="h-3 w-3" /> Private to UNVEIL Safety</span>
              </Row>
            </Card>
            <Card>
              <HealthConsentRow />
            </Card>
            <Card>
              <h3 className="font-display text-base">{t("common.language")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">Change the interface language anytime.</p>
              <div className="mt-3"><LanguageSwitcher showSpoken /></div>
            </Card>
          </Group>

          {/* ====================== NOTIFICATIONS ====================== */}
          <Group id="notifications" icon={Bell} title="Notifications">
            <Card>
              <Row label="Push notifications" hint="New matches, messages, reveals">
                <span className="muted-pill">Managed by your device</span>
              </Row>
              <Row label="Email notifications" hint="Weekly digests + critical account events">
                <span className="muted-pill">On by default</span>
              </Row>
              <Row label="Message notifications" hint="In-app sounds and badges">
                <span className="muted-pill">Always on</span>
              </Row>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Critical account & safety alerts are always delivered.
              </p>
            </Card>
          </Group>

          {/* ====================== MEMBERSHIP ====================== */}
          <Group id="membership" icon={CreditCard} title="Membership">
            <Card>
              <h3 className="font-display text-base">Messaging allowance</h3>
              {quota.loading ? (
                <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
              ) : quota.unlimited ? (
                <div className="mt-3 space-y-2 text-sm">
                  {premiumActive && (
                    <div className="flex items-center gap-2 text-primary"><Crown className="h-4 w-4" /> Premium active · unlimited messaging</div>
                  )}
                  {passActive && (
                    <div className="flex items-center gap-2 text-accent"><Zap className="h-4 w-4" /> Daily Pass active · {formatRemainingTime(quota.messagePassUntil)} remaining</div>
                  )}
                </div>
              ) : (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {quota.remaining} of {quota.dailyLimit} free messages remaining today. Resets {quota.resetsAt ? new Date(quota.resetsAt).toLocaleTimeString() : "in 24h"}.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to="/checkout" search={{ product: "message_pass" } as never} className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent/10 px-4 py-1.5 text-xs text-accent hover:bg-accent/20">
                      <Zap className="h-3 w-3" /> Daily Pass · $1.99
                    </Link>
                    <Link to="/premium" className="inline-flex items-center gap-1 rounded-full bg-gradient-hero px-4 py-1.5 text-xs text-primary-foreground shadow-glow">
                      <Crown className="h-3 w-3" /> Go Premium
                    </Link>
                  </div>
                </>
              )}
            </Card>
            <Card>
              <Row label="Subscription & billing" hint="Manage plan, payment method, invoices">
                <Link to="/manage-subscription" className="link-pill">Open subscription</Link>
              </Row>
              <Row label="Restore purchases" hint="Re-sync App Store / Play purchases">
                <RestorePurchasesButton />
              </Row>
            </Card>
          </Group>

          {/* ====================== SUPPORT ====================== */}
          <Group id="support" icon={LifeBuoy} title="Support">
            <Card>
              <Row label="Help Centre" hint="Guides, FAQs, troubleshooting">
                <Link to="/support" className="link-pill">Open help</Link>
              </Row>
              <Row label="Contact support" hint="Reach the UNVEIL team directly">
                <Link to="/contact" className="link-pill">Contact us</Link>
              </Row>
              <Row label="Community guidelines" hint="What's expected of every member">
                <Link to="/community-guidelines" className="link-pill">Read guidelines</Link>
              </Row>
              <Row label="Terms & conditions" hint="Service terms">
                <Link to="/terms" className="link-pill"><FileText className="h-3 w-3" /> View terms</Link>
              </Row>
              <Row label="Privacy policy" hint="How we handle your data">
                <Link to="/privacy" className="link-pill"><FileText className="h-3 w-3" /> View policy</Link>
              </Row>
              <Row label="Refund policy" hint="Subscription refunds">
                <Link to="/refund" className="link-pill"><FileText className="h-3 w-3" /> View refunds</Link>
              </Row>
              <Row label="Safety" hint="Reporting, blocking, in-person safety">
                <Link to="/safety" className="link-pill">Safety resources</Link>
              </Row>
            </Card>
            <FeedbackForm />
          </Group>

          {/* ====================== ACCOUNT MANAGEMENT ====================== */}
          <Group id="management" icon={SettingsIcon} title="Account Management">
            <Card>
              <Row label="Export my data" hint="Download a copy of your profile and messages">
                <button
                  type="button"
                  onClick={() => toast.message("Data export will be emailed to you within 30 days.", { description: "Contact support@unveil.best to request immediately." })}
                  className="link-pill"
                >
                  <Download className="h-3 w-3" /> Request export
                </button>
              </Row>
              <Row label="Restart profile setup" hint="Redo onboarding from the beginning">
                <Link to="/onboarding" search={{ edit: 1 } as never} className="link-pill">
                  <RefreshCw className="h-3 w-3" /> Restart setup
                </Link>
              </Row>
            </Card>

            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
              <h3 className="flex items-center gap-2 font-display text-base text-destructive">
                <AlertTriangle className="h-5 w-5" /> Delete account
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Permanently delete your UNVEIL account, profile, matches, messages, and all related data.
                This cannot be undone. For your safety, the same email cannot register a new account for 24 hours after deletion.
              </p>
              {!confirmOpen ? (
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-destructive bg-destructive/10 px-5 py-2 text-xs font-medium text-destructive hover:bg-destructive/20"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete my account
                </button>
              ) : (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-foreground">
                    Type <span className="font-mono font-bold">DELETE</span> to confirm. You will be signed out immediately.
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full max-w-xs rounded-xl border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-destructive"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setConfirmOpen(false); setConfirmText(""); }}
                      disabled={deleting}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-xs hover:bg-surface disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting || confirmText.trim().toUpperCase() !== "DELETE"}
                      className="inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2 text-xs font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {deleting ? "Deleting…" : "Permanently delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Group>
        </div>
      </section>

      {/* Local component styles */}
      <style>{`
        .link-pill {
          display: inline-flex; align-items: center; gap: 0.25rem;
          border-radius: 9999px; background: oklch(0.18 0.07 298 / 0.7);
          padding: 0.35rem 0.8rem; font-size: 11px; color: var(--foreground);
        }
        .link-pill:hover { background: oklch(0.22 0.09 298 / 0.9); }
        .muted-pill {
          display: inline-flex; align-items: center; gap: 0.25rem;
          border-radius: 9999px; border: 1px solid var(--border);
          padding: 0.3rem 0.7rem; font-size: 11px; color: var(--muted-foreground);
        }
      `}</style>
    </div>
  );
}

function Group({ id, icon: Icon, title, children }: { id: string; icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="font-mono text-[11px] uppercase tracking-luxury text-muted-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-6">{children}</div>;
}

function Row({ label, hint, children }: { label: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/40 py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div className="min-w-0">
        <div className="text-sm text-foreground">{label}</div>
        {hint && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
