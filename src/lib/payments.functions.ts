import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutSessionResult = { clientSecret: string } | { error: string };
type PortalSessionResult = { url: string } | { error: string };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

// Allowed price IDs for the beta launch. Any other ID is rejected at the
// server boundary so legacy paths (verified_badge_onetime, premium_quarterly,
// premium_semiannual, premium_yearly) cannot be reached even via a crafted URL.
const PRICE_META: Record<string, { kind: string; durationDays?: number; durationHours?: number }> = {
  premium_monthly: { kind: "premium_subscription" },
  premium_quarterly: { kind: "premium_subscription" },
  premium_annual: { kind: "premium_subscription" },
  message_pass_24h: { kind: "message_pass_24h", durationHours: 24 },
};

const ALLOWED_RETURN_HOSTS = new Set([
  "unveil.best",
  "www.unveil.best",
  "mind-match-maze.lovable.app",
  "localhost",
  "127.0.0.1",
]);

function validateReturnUrl(raw: string): string {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error("Invalid returnUrl"); }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Invalid returnUrl protocol");
  const host = u.hostname;
  const ok =
    ALLOWED_RETURN_HOSTS.has(host) ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovable.dev") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovable.host");
  if (!ok) throw new Error("returnUrl host not allowed");
  return u.toString();
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    priceId: string;
    quantity?: number;
    customerEmail?: string;
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
    if (!PRICE_META[data.priceId]) throw new Error("This product is no longer available.");
    if (data.customerEmail && data.customerEmail.length > 254) throw new Error("Invalid email");
    data.returnUrl = validateReturnUrl(data.returnUrl);
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    try {
      const { userId, supabase } = context;
      let email = data.customerEmail;
      if (!email) {
        const { data: u } = await supabase.auth.getUser();
        email = u.user?.email ?? undefined;
      }
      const stripe = createStripeClient(data.environment);

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) throw new Error("Price not found");
      const stripePrice = prices.data[0];
      const isRecurring = stripePrice.type === "recurring";
      const meta = PRICE_META[data.priceId] ?? { kind: "other" };

      const customerId = await resolveOrCreateCustomer(stripe, { email, userId });

      let productDescription: string | undefined;
      if (!isRecurring) {
        const productId = typeof stripePrice.product === "string"
          ? stripePrice.product
          : (stripePrice.product as any).id;
        const product = await stripe.products.retrieve(productId);
        productDescription = product.name;
      }

      const sharedMeta: Record<string, string> = {
        kind: meta.kind,
        priceId: data.priceId,
        userId, // server-verified from JWT
      };
      if (meta.durationDays) sharedMeta.durationDays = String(meta.durationDays);
      if (meta.durationHours) sharedMeta.durationHours = String(meta.durationHours);

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: data.quantity || 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page" as any,
        return_url: data.returnUrl,
        managed_payments: { enabled: true } as any,
        customer: customerId,
        ...(!isRecurring && { payment_intent_data: { description: productDescription } }),
        metadata: sharedMeta,
        ...(isRecurring && { subscription_data: { metadata: sharedMeta } }),
      } as any);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => {
    if (data.returnUrl) data.returnUrl = validateReturnUrl(data.returnUrl);
    return data;
  })
  .handler(async ({ data, context }): Promise<PortalSessionResult> => {
    const { supabase, userId } = context;

    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subError || !sub?.stripe_customer_id) throw new Error("No subscription found");

    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id as string,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
