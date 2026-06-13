#!/usr/bin/env node
/**
 * Publish-protection: assert the live Stripe catalog does NOT contain any
 * active price with lookup_key `premium_quarterly_3999`. That lookup key
 * is the invalid $39.99 monthly fallback which Lovable's sandbox→live
 * mirror has recreated more than once. Run after publish to fail loudly
 * if it comes back.
 *
 * Usage:
 *   STRIPE_LIVE_API_KEY=... LOVABLE_API_KEY=... node scripts/verify-stripe-catalog.mjs
 *   STRIPE_SANDBOX_API_KEY=... LOVABLE_API_KEY=... node scripts/verify-stripe-catalog.mjs --env=sandbox
 */
const args = process.argv.slice(2);
const envArg = args.find((a) => a.startsWith("--env="));
const env = envArg ? envArg.split("=")[1] : "live";
const key = env === "sandbox" ? process.env.STRIPE_SANDBOX_API_KEY : process.env.STRIPE_LIVE_API_KEY;
const lov = process.env.LOVABLE_API_KEY;
if (!key || !lov) { console.error("Missing STRIPE_*_API_KEY or LOVABLE_API_KEY"); process.exit(2); }

const GW = "https://connector-gateway.lovable.dev/stripe/v1";
const FORBIDDEN = ["premium_quarterly_3999"];
const REQUIRED = {
  premium_quarterly: { interval: "month", interval_count: 3, unit_amount: 3999 },
  premium_monthly:   { interval: "month", interval_count: 1, unit_amount: 1599 },
  premium_yearly:    { interval: "year",  interval_count: 1, unit_amount: 14999 },
};
const REQUIRED_ONE_TIME = {
  message_pass_24h: { unit_amount: 199 },
  message_pass_2w:  { unit_amount: 999 },
};

async function listByLookup(lookup) {
  const url = `${GW}/prices?active=true&lookup_keys[]=${encodeURIComponent(lookup)}&limit=10`;
  const res = await fetch(url, {
    headers: { "X-Connection-Api-Key": key, "Lovable-API-Key": lov },
  });
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${await res.text()}`);
  return (await res.json()).data || [];
}

let failures = 0;
for (const k of FORBIDDEN) {
  const found = await listByLookup(k);
  if (found.length) {
    console.error(`❌ Forbidden active lookup_key present: ${k} → ${found.map(p => p.id).join(", ")}`);
    failures++;
  } else {
    console.log(`✅ No active price with lookup_key ${k}`);
  }
}
for (const [k, want] of Object.entries(REQUIRED)) {
  const found = await listByLookup(k);
  if (!found.length) { console.error(`❌ Required price missing: ${k}`); failures++; continue; }
  const p = found[0];
  const ok = p.recurring?.interval === want.interval
    && p.recurring?.interval_count === want.interval_count
    && p.unit_amount === want.unit_amount;
  if (!ok) {
    console.error(`❌ ${k} shape wrong: got interval=${p.recurring?.interval}x${p.recurring?.interval_count} amount=${p.unit_amount}, want ${JSON.stringify(want)}`);
    failures++;
  } else {
    console.log(`✅ ${k} → ${p.id} (${p.unit_amount/100} ${p.currency} every ${p.recurring.interval_count} ${p.recurring.interval})`);
  }
}
for (const [k, want] of Object.entries(REQUIRED_ONE_TIME)) {
  const found = await listByLookup(k);
  if (!found.length) { console.error(`❌ Required one-time price missing: ${k}`); failures++; continue; }
  const p = found[0];
  if (p.unit_amount !== want.unit_amount || p.recurring) {
    console.error(`❌ ${k} shape wrong: amount=${p.unit_amount} recurring=${!!p.recurring}, want one-time ${want.unit_amount}`);
    failures++;
  } else {
    console.log(`✅ ${k} → ${p.id} ($${p.unit_amount/100} one-time)`);
  }
}
if (failures) { console.error(`\n${failures} failure(s) in ${env} catalog`); process.exit(1); }
console.log(`\n✅ ${env} catalog clean`);
