import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { PageBackButton } from "@/components/PageBackButton";
import { SafetyReminder } from "@/components/SafetyReminder";
import { PartnerPicker, usePartner } from "@/components/PartnerPicker";
import { giveShareConsent, saveMyContact, loadMyContact, loadPartnerContact } from "@/lib/social-api";
import { Phone, Lock, Unlock, Check, MessageSquare, Instagram, Send, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

type SearchParams = { u?: string };

export const Route = createFileRoute("/contact-share")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    u: typeof search.u === "string" ? search.u : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Share Contact — UNVEIL" },
      { name: "description", content: "Contact details unlock only when both people consent." },
    ],
  }),
  component: ContactShare,
});

type Channel = "phone" | "whatsapp" | "instagram" | "telegram";

function ContactShare() {
  const search = useSearch({ from: "/contact-share" }) as SearchParams;
  const { partner, partners, partnerId, setPartnerId, loading, refresh } = usePartner(search.u);
  

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6"><PageBackButton /></div>
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-6">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Contact Sharing</div>
          <h1 className="mt-2 font-display text-4xl font-light md:text-5xl">
            Share when <span className="italic text-gradient-hero">both</span> of you are ready.
          </h1>
          <p className="mt-3 text-muted-foreground">
            Contacts stay hidden until you and your match both consent. Disable anytime.
          </p>
        </div>

        <SafetyReminder />

        <div className="mt-6 rounded-3xl border border-border bg-card p-6">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Choose a match</div>
          {loading
            ? <div className="text-sm text-muted-foreground">Loading your matches…</div>
            : <PartnerPicker partners={partners} value={partnerId} onChange={setPartnerId} />}
        </div>

        {partner && <SharePanel key={partner.userId} partner={partner} onRefresh={refresh} />}
      </div>
    </div>
  );
}

function SharePanel({ partner, onRefresh }: { partner: NonNullable<ReturnType<typeof usePartner>["partner"]>; onRefresh: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<Record<Channel, string>>({ phone: "", whatsapp: "", instagram: "", telegram: "" });
  const [theirs, setTheirs] = useState<Record<Channel, string | null> | null>(null);

  useEffect(() => {
    loadMyContact(partner.userId).then((m) => {
      if (!m) return;
      setMine({
        phone: m.phone ?? "", whatsapp: m.whatsapp ?? "",
        instagram: m.instagram ?? "", telegram: m.telegram ?? "",
      });
    });
  }, [partner.userId]);

  useEffect(() => {
    if (!partner.shareUnlocked) { setTheirs(null); return; }
    loadPartnerContact(partner.userId).then((t) => {
      setTheirs(t ? { phone: t.phone, whatsapp: t.whatsapp, instagram: t.instagram, telegram: t.telegram } : null);
    });
  }, [partner.userId, partner.shareUnlocked]);

  const ready = partner.interactionCount >= 5 || partner.chemistryScore >= 25;

  async function handleConsent() {
    setBusy(true);
    // Save my handles first (so unlock is immediately useful).
    await saveMyContact(partner.userId, mine);
    const res = await giveShareConsent(partner.userId);
    setBusy(false);
    if (res.error) { toast.error(res.error); return; }
    await onRefresh();
    if (res.unlocked) toast.success("Both consented — contact details revealed.");
    else toast.success("Your consent is recorded. Waiting on your match.");
  }

  const channels: { id: Channel; label: string; icon: React.ElementType; placeholder: string }[] = [
    { id: "phone",     label: "Phone",     icon: Phone,         placeholder: "+1 555 0100" },
    { id: "whatsapp",  label: "WhatsApp",  icon: MessageSquare, placeholder: "+1 555 0100" },
    { id: "instagram", label: "Instagram", icon: Instagram,     placeholder: "@handle" },
    { id: "telegram",  label: "Telegram",  icon: Send,          placeholder: "@handle" },
  ];

  return (
    <>
      <div className="mt-6 rounded-3xl border border-border bg-card p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Connection signal</div>
          <div className="font-mono text-[10px] text-muted-foreground">
            {partner.interactionCount} messages · chemistry {partner.chemistryScore}
          </div>
        </div>
        <Gate done label={`Matched with ${partner.name}`} />
        <Gate done={ready} label="Enough genuine interaction (5+ messages or chemistry ≥ 25)" />
        <Gate done={partner.shareUserConsent} label="You've given consent" />
        <Gate done={partner.shareMatchedConsent} label={`${partner.name} has given consent`} />
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-display text-xl">Your handles</div>
            <div className="text-xs text-muted-foreground">
              Fill only what you want shared. Nothing reveals until both consent.
            </div>
          </div>
          {partner.shareUnlocked ? <Unlock className="h-5 w-5 text-neon" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
        </div>

        <div className="space-y-3">
          {channels.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-surface/40 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">{c.label}</label>
                    <input
                      value={mine[c.id]}
                      onChange={(e) => setMine((m) => ({ ...m, [c.id]: e.target.value }))}
                      placeholder={c.placeholder}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[10px] uppercase text-muted-foreground">{partner.name}</div>
                    <div className="text-xs">
                      {partner.shareUnlocked && theirs?.[c.id]
                        ? <span className="font-medium text-foreground">{theirs[c.id]}</span>
                        : <span className="text-muted-foreground">{partner.shareUnlocked ? "—" : "hidden"}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!partner.shareUserConsent ? (
          <button
            disabled={busy || !ready}
            onClick={handleConsent}
            title={ready ? "" : "Spend a bit more time chatting first."}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-hero px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-40"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            I consent to share these details
          </button>
        ) : partner.shareUnlocked ? (
          <Link to="/date-plan" search={{ u: partner.userId } as never} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-hero px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow">
            Plan your date <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-surface/40 p-4 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-neon" /> Your consent is in. Waiting on {partner.name}.
          </div>
        )}
      </div>
    </>
  );
}

function Gate({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      <span className={`flex h-5 w-5 items-center justify-center rounded-full ${done ? "bg-neon/20 text-neon" : "bg-surface text-muted-foreground"}`}>
        {done ? <Check className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
      </span>
      <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
