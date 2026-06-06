import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

async function recordTransaction(row: {
  user_id: string;
  kind: string;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_invoice_id?: string | null;
  stripe_subscription_id?: string | null;
  price_id?: string | null;
  amount_cents: number;
  currency?: string;
  status: string;
  environment: StripeEnv;
  description?: string | null;
}) {
  await getSupabase().from("transactions").insert(row);
}

async function handleSubscriptionCreated(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.lookup_key
    || item?.price?.metadata?.lovable_external_id
    || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const periodEndIso = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      tier: subscription.status === "active" || subscription.status === "trialing" ? "premium" : "free",
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEndIso,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );

  // Mirror onto profile for fast gating
  if (periodEndIso) {
    await getSupabase()
      .from("profiles")
      .update({
        premium_until: periodEndIso,
        subscription_tier: "premium",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  }
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.lookup_key
    || item?.price?.metadata?.lovable_external_id
    || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const periodEndIso = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

  await getSupabase()
    .from("subscriptions")
    .update({
      status: subscription.status,
      product_id: productId,
      price_id: priceId,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEndIso,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  const userId = subscription.metadata?.userId;
  if (userId && periodEndIso) {
    await getSupabase()
      .from("profiles")
      .update({ premium_until: periodEndIso, updated_at: new Date().toISOString() })
      .eq("id", userId);
  }
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      tier: "free",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  const userId = subscription.metadata?.userId;
  if (userId) {
    await getSupabase()
      .from("profiles")
      .update({ subscription_tier: "free", updated_at: new Date().toISOString() })
      .eq("id", userId);
  }
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const userId = session.metadata?.userId;
  const kind = session.metadata?.kind ?? "other";
  const priceId = session.metadata?.priceId ?? null;
  const amount = session.amount_total ?? 0;
  const currency = session.currency ?? "usd";

  if (!userId) {
    console.error("Checkout completed without userId metadata");
    return;
  }

  // Always record a transaction
  await recordTransaction({
    user_id: userId,
    kind,
    stripe_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent ?? null,
    stripe_invoice_id: session.invoice ?? null,
    stripe_subscription_id: session.subscription ?? null,
    price_id: priceId,
    amount_cents: amount,
    currency,
    status: session.payment_status === "paid" ? "succeeded" : (session.payment_status ?? "pending"),
    environment: env,
    description: session.metadata?.description ?? null,
  });

  // Branch by kind
  if (kind === "verification_badge") {
    await getSupabase().from("verification_payments").upsert(
      {
        user_id: userId,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent ?? null,
        amount_cents: amount,
        currency,
        status: session.payment_status === "paid" ? "paid" : "pending",
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_session_id" }
    );

    if (session.payment_status === "paid") {
      // Activate verified status and reset daily counter so the user
      // immediately gets the verified 15/day quota in their current window.
      await getSupabase()
        .from("profiles")
        .update({
          badge_paid: true,
          verified: true,
          daily_message_count: 0,
          daily_message_reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      // Mark any existing verification_request as approved (best-effort).
      await getSupabase()
        .from("verification_requests")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    }
    return;
  }

  if (kind === "premium_one_time") {
    const days = Number(session.metadata?.durationDays ?? 0);
    if (days > 0 && session.payment_status === "paid") {
      // Extend premium_until from MAX(now, current) + days
      const { data: prof } = await getSupabase()
        .from("profiles")
        .select("premium_until")
        .eq("id", userId)
        .maybeSingle();
      const base = prof?.premium_until && new Date(prof.premium_until) > new Date()
        ? new Date(prof.premium_until)
        : new Date();
      const newEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
      await getSupabase()
        .from("profiles")
        .update({
          premium_until: newEnd.toISOString(),
          subscription_tier: "premium",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }
    return;
  }

  if (kind === "message_pass_24h") {
    const hours = Number(session.metadata?.durationHours ?? 24);
    if (session.payment_status === "paid") {
      const { data: prof } = await getSupabase()
        .from("profiles")
        .select("message_pass_until")
        .eq("id", userId)
        .maybeSingle();
      const base = prof?.message_pass_until && new Date(prof.message_pass_until) > new Date()
        ? new Date(prof.message_pass_until)
        : new Date();
      const newEnd = new Date(base.getTime() + hours * 60 * 60 * 1000);
      await getSupabase()
        .from("profiles")
        .update({ message_pass_until: newEnd.toISOString(), updated_at: new Date().toISOString() })
        .eq("id", userId);
    }
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "customer.subscription.created":
      await handleSubscriptionCreated(event.data.object, env);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook received with invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
