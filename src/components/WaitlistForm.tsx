import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Loader2 } from "lucide-react";
import { track } from "@/lib/analytics";

const COUNTRIES = ["United States","United Kingdom","Canada","Australia","Germany","France","Italy","Spain","Portugal","Netherlands","Brazil","Mexico","Argentina","Japan","South Korea","Singapore","UAE","India","Other"];
const GOALS = [
  { id: "serious", label: "Serious relationship" },
  { id: "long_term", label: "Long-term partner" },
  { id: "marriage", label: "Marriage" },
  { id: "intentional_dating", label: "Intentional dating" },
  { id: "exploring", label: "Still exploring" },
];

export function WaitlistForm() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const { error } = await supabase.from("waitlist").insert({
      email: email.trim().toLowerCase(),
      first_name: firstName.trim(),
      country, gender, relationship_goal: goal,
      source: "landing",
    });
    setBusy(false);
    if (error) {
      if (error.code === "23505") { setJoined(true); return; }
      setErr(error.message); return;
    }
    await track("waitlist_join", { country, gender, goal });
    setJoined(true);
  }

  if (joined) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-5 py-3 text-sm">
        <Heart className="h-4 w-4 text-accent" /> You're on the list. We'll be in touch.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-8 grid w-full max-w-xl gap-3 text-left">
      <div className="grid gap-3 sm:grid-cols-2">
        <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={50}
          placeholder="First name"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary" />
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255}
          placeholder="Email"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select required value={country} onChange={(e) => setCountry(e.target.value)}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary">
          <option value="" disabled>Country</option>
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select required value={gender} onChange={(e) => setGender(e.target.value)}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary">
          <option value="" disabled>Gender</option>
          <option value="woman">Woman</option>
          <option value="man">Man</option>
          <option value="nonbinary">Non-binary</option>
          <option value="other">Other / prefer not to say</option>
        </select>
      </div>
      <select required value={goal} onChange={(e) => setGoal(e.target.value)}
        className="rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary">
        <option value="" disabled>Relationship goal</option>
        {GOALS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
      </select>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <button disabled={busy} className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-hero px-7 py-3.5 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? "Joining…" : "Join the Private Beta"}
      </button>
      <p className="text-center text-[11px] text-muted-foreground">Approved members will receive an invite at the email above.</p>
    </form>
  );
}
