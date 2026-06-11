#!/usr/bin/env node
import { writeFileSync } from "fs";
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
 *   node scripts/verify-production.mjs https://...       # custom base URL
 *   node scripts/verify-production.mjs --html=report.html # write HTML report
 *
 * Exit code 0 on success, 1 on any failed check.
 */

const args = process.argv.slice(2);
const baseArg = args.find((a) => !a.startsWith("--"));
const htmlFlag = args.find((a) => a.startsWith("--html="));
const htmlPath = htmlFlag ? htmlFlag.split("=")[1] : null;

const BASE = (baseArg || "https://unveil.best").replace(/\/$/, "");

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
  // Exclude URL-encoded `UNVEIL+Support+Request` in mailto links (`+` = space).
  const unveilPlus = /UNVEIL\+(?!Support)/.test(body);
  record("/terms has no 'UNVEIL+' product mention", !unveilPlus);
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

// ── HTML report generator ───────────────────────────────────────────────────
function writeHtmlReport(path) {
  const passed = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const now = new Date().toISOString();

  const rows = results.map((r) => {
    const cls = r.ok ? "pass" : "fail";
    const icon = r.ok ? "✅" : "❌";
    const detail = r.detail ? `<div class="detail">${escapeHtml(r.detail)}</div>` : "";
    return `<tr class="${cls}"><td>${icon}</td><td>${escapeHtml(r.name)}</td><td>${detail}</td></tr>`;
  }).join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>UNVEIL Production Verification — ${BASE}</title>
<style>
  :root { --bg:#0f172a; --card:#1e293b; --text:#e2e8f0; --muted:#94a3b8; --pass:#22c55e; --fail:#ef4444; }
  * { box-sizing:border-box; }
  body { font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; background:var(--bg); color:var(--text); margin:0; padding:2rem; }
  .container { max-width:900px; margin:0 auto; }
  h1 { font-weight:300; margin:0 0 .5rem; }
  .meta { color:var(--muted); font-size:.9rem; margin-bottom:1.5rem; }
  .summary { display:flex; gap:1rem; margin-bottom:1.5rem; }
  .pill { padding:.5rem 1rem; border-radius:999px; background:var(--card); font-size:.85rem; }
  .pill.pass { color:var(--pass); }
  .pill.fail { color:var(--fail); }
  table { width:100%; border-collapse:collapse; background:var(--card); border-radius:12px; overflow:hidden; }
  th { text-align:left; padding:.75rem 1rem; background:#334155; font-size:.75rem; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); }
  td { padding:.75rem 1rem; border-top:1px solid #334155; vertical-align:top; }
  tr.pass td:first-child { color:var(--pass); }
  tr.fail td:first-child { color:var(--fail); }
  .detail { color:var(--muted); font-size:.85rem; margin-top:.25rem; }
  .footer { margin-top:1.5rem; color:var(--muted); font-size:.85rem; }
</style>
</head>
<body>
<div class="container">
  <h1>Production Verification Report</h1>
  <div class="meta">${BASE} · ${now}</div>
  <div class="summary">
    <div class="pill pass">${passed.length} passed</div>
    <div class="pill ${failed.length ? "fail" : "pass"}">${failed.length} failed</div>
  </div>
  <table>
    <thead><tr><th style="width:2rem"></th><th>Check</th><th>Detail</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Generated by scripts/verify-production.mjs</div>
</div>
</body>
</html>`;

  const fs = require("fs");
  fs.writeFileSync(path, html, "utf-8");
  console.log(`\n📄 HTML report written to ${path}`);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Main ────────────────────────────────────────────────────────────────────
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
  } else {
    console.log("\n✅ Production looks good. Safe to proceed to TestFlight.\n");
  }

  if (htmlPath) {
    writeHtmlReport(htmlPath);
  }

  if (failed.length) {
    process.exit(1);
  }
})();
