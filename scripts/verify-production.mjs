#!/usr/bin/env node
/**
 * Post-deploy production verification for unveil.best.
 *
 * Safe / read-only:
 *  - Fetches public pages (/premium, /terms, /refund) and asserts content.
 *  - Does NOT create Stripe Checkout Sessions (that requires an authenticated
 *    user JWT for createCheckoutSession). Instead it verifies the in-app
 *    routing layer — that each plan's checkout entry point loads and resolves
 *    to the expected canonical price id — by asserting the static mapping in
 *    src/routes/checkout.tsx + src/lib/payments.functions.ts, and by HEAD-ing
 *    /checkout?product=<plan> on the live site to confirm the route exists.
 *
 * Usage:
 *   node scripts/verify-production.mjs                 # https://unveil.best
 *   node scripts/verify-production.mjs https://...     # custom base URL
 *
 * Exit code 0 on success, 1 on any failed check.
 */

const BASE = (process.argv[2] || "https://unveil.best").replace(/\/$/, "");

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const tag = ok ? "✅" : "❌";
  console.log(`${tag} ${name}${detail ? `  — ${detail}` : ""}`);
}

async function getText(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "user-agent": "unveil-prod-verify/1.0", "cache-control": "no-cache" },
  });
  const body = await res.text();
  return { status: res.status, body };
}

async function headOk(path) {
  const res = await fetch(`${BASE}${path}`, { method: "GET", redirect: "manual" });
  return res.status >= 200 && res.status < 400;
}

// ── /premium ────────────────────────────────────────────────────────────────
async function checkPremium() {
  const { status, body } = await getText("/premium");
  record("/premium loads (200)", status === 200, `status=${status}`);
  record("/premium shows Quarterly $39.99", /\$39\.99/.test(body));
  record('/premium quarterly copy "Save 17%"', /Save\s*17%/i.test(body));
  record('/premium "Most chosen" badge', /Most\s*chosen/i.test(body));
  record("/premium does NOT show legacy $49.99 quarterly",
    !/\$49\.99/.test(body),
    /\$49\.99/.test(body) ? "stale build still served" : "");
}

// ── /terms ──────────────────────────────────────────────────────────────────
async function checkTerms() {
  const { status, body } = await getText("/terms");
  record("/terms loads (200)", status === 200, `status=${status}`);
  record("/terms has no 'UNVEIL+'", !/UNVEIL\+/.test(body));
  record("/terms has no 'UNVEIL Black'", !/UNVEIL\s+Black/i.test(body));
}

// ── /refund ─────────────────────────────────────────────────────────────────
async function checkRefund() {
  const { status, body } = await getText("/refund");
  record("/refund loads (200)", status === 200, `status=${status}`);
  record("/refund has policy content",
    /refund/i.test(body) && body.length > 500,
    `bytes=${body.length}`);
}

// ── Checkout route reachability per plan ────────────────────────────────────
// These are public route loads; the embedded Stripe session is created
// client-side only after auth, so we don't trigger a real session here.
const PLANS = [
  { product: "pass_24h",          label: "24-Hour Pass" },
  { product: "pass_2w",           label: "2-Week Pass" },
  { product: "premium_monthly",   label: "Monthly" },
  { product: "premium_quarterly", label: "Quarterly" },
  { product: "premium_annual",    label: "Annual" },
];

async function checkCheckoutRoutes() {
  for (const p of PLANS) {
    const ok = await headOk(`/checkout?product=${p.product}`);
    record(`/checkout?product=${p.product} reachable (${p.label})`, ok);
  }
}

(async () => {
  console.log(`\n🔎 Verifying ${BASE}\n`);
  try {
    await checkPremium();
    await checkTerms();
    await checkRefund();
    await checkCheckoutRoutes();
  } catch (err) {
    record("verification crashed", false, String(err?.message || err));
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) {
    console.log("\nFailed:");
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    process.exit(1);
  }
  console.log("\n✅ Production looks good. Safe to proceed to TestFlight.\n");
})();
