import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { ALL_PHONE_COUNTRIES, DEFAULT_PHONE_COUNTRY, type PhoneCountry } from "@/lib/phone-countries";
import { ArrowRight, ShieldCheck } from "lucide-react";

type Step = "enter" | "verify";

function sanitizeLocal(input: string) {
  // Strip everything but digits; drop leading zero used in many local formats.
  const digits = input.replace(/\D+/g, "");
  return digits.replace(/^0+/, "");
}

type Channel = "sms" | "whatsapp";

export function PhoneAuthForm({ mode }: { mode: "signin" | "signup" }) {
  const navigate = useNavigate();
  const [country, setCountry] = useState<PhoneCountry>(DEFAULT_PHONE_COUNTRY);
  const [local, setLocal] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<Step>("enter");
  const [channel, setChannel] = useState<Channel>("sms");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const e164 = useMemo(
    () => `${country.dial}${sanitizeLocal(local)}`,
    [country, local],
  );

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setInfo("");
    const digits = sanitizeLocal(local);
    if (digits.length < 6) { setErr("Enter a valid phone number"); return; }
    setLoading(true);

    let usedChannel: Channel = channel;
    let { error } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: { channel: usedChannel },
    });

    // Auto-fallback: if WhatsApp delivery isn't available for this number,
    // silently retry over SMS so the user still receives a code.
    if (error && usedChannel === "whatsapp") {
      const m = (error.message || "").toLowerCase();
      const whatsappUnavailable =
        m.includes("whatsapp") ||
        m.includes("channel") ||
        m.includes("not supported") ||
        m.includes("unavailable") ||
        m.includes("invalid 'to'") ||
        m.includes("60200") || // Twilio: invalid parameter for channel
        m.includes("63003") || // Twilio: channel could not find To address
        m.includes("63007") || // Twilio: no WhatsApp sender
        m.includes("63016");   // Twilio: failed to send freeform WhatsApp
      if (whatsappUnavailable) {
        usedChannel = "sms";
        const retry = await supabase.auth.signInWithOtp({
          phone: e164,
          options: { channel: "sms" },
        });
        error = retry.error;
      }
    }

    setLoading(false);
    if (error) {
      const msg = error.message || "";
      if (msg.toLowerCase().includes("sms provider") || msg.toLowerCase().includes("provider not configured")) {
        setErr("SMS sending isn't configured yet. We'll send your code as soon as the provider is live.");
      } else {
        setErr(msg || "Could not send the verification code.");
      }
      return;
    }
    setStep("verify");
    const channelLabel = usedChannel === "whatsapp" ? "WhatsApp" : "SMS";
    const fallbackNote =
      channel === "whatsapp" && usedChannel === "sms"
        ? " (WhatsApp wasn't available for this number, so we sent SMS instead.)"
        : "";
    setInfo(`We sent a 6-digit code to ${e164} via ${channelLabel}.${fallbackNote} It expires in 10 minutes.`);
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!/^\d{6}$/.test(otp)) { setErr("Enter the 6-digit code"); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: e164,
      token: otp,
      type: "sms",
    });
    if (error || !data.user) {
      setLoading(false);
      setErr(error?.message ?? "Invalid or expired code");
      return;
    }
    // Persist phone metadata on the profile. Phone fields are not in the
    // profiles_guard_update lock-list, so this is a normal authenticated update.
    try {
      await supabase.from("profiles").update({
        phone_number: e164,
        country_code: country.code,
        verified_phone: e164,
        phone_verified_at: new Date().toISOString(),
      }).eq("id", data.user.id);
    } catch {
      // Non-blocking; user is signed in.
    }
    setLoading(false);
    // If the profile already exists with onboarding_complete, go to matches; else onboarding.
    const { data: prof } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", data.user.id)
      .maybeSingle();
    navigate({ to: prof?.onboarding_complete ? "/matches" : "/onboarding" });
  };

  if (step === "verify") {
    return (
      <form onSubmit={verifyOtp} className="space-y-3">
        {info && <p className="text-xs text-muted-foreground">{info}</p>}
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          placeholder="6-digit code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D+/g, "").slice(0, 6))}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-center text-lg tracking-[0.5em] outline-none focus:border-primary"
        />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <button
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-hero px-6 py-3 font-medium text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {loading ? "Verifying…" : <>Verify <ArrowRight className="h-4 w-4" /></>}
        </button>
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => { setStep("enter"); setOtp(""); setErr(""); setInfo(""); }}
            className="text-muted-foreground underline"
          >
            Change number
          </button>
          <button
            type="button"
            onClick={(e) => sendOtp(e)}
            className="text-muted-foreground underline"
          >
            Resend code
          </button>
        </div>
        <p className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" /> Verified by SMS
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={sendOtp} className="space-y-3">
      <div className="flex gap-2">
        <select
          value={country.code}
          onChange={(e) => {
            const c = ALL_PHONE_COUNTRIES.find((x) => x.code === e.target.value);
            if (c) setCountry(c);
          }}
          className="w-[42%] rounded-xl border border-border bg-surface px-2 py-3 text-sm outline-none focus:border-primary"
        >
          {ALL_PHONE_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.dial} {c.name}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required
          placeholder="Phone number"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="flex gap-2">
        {(["sms", "whatsapp"] as Channel[]).map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setChannel(c)}
            className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition ${
              channel === c
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            {c === "sms" ? "SMS" : "WhatsApp"}
          </button>
        ))}
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <button
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-hero px-6 py-3 font-medium text-primary-foreground shadow-glow disabled:opacity-50"
      >
        {loading ? "Sending code…" : (
          <>{mode === "signup" ? "Continue with Phone" : "Send code"} <ArrowRight className="h-4 w-4" /></>
        )}
      </button>
      <p className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3" /> Verified by SMS · code expires in 10 min
      </p>
    </form>
  );
}
