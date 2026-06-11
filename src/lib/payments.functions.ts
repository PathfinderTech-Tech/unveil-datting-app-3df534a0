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

type CanonicalPriceId =
  | "premium_monthly"
  | "premium_quarterly"
  | "premium_annual"
  | "message_pass_24h"
  | "message_pass_2w";

type PriceCatalogItem = {
  kind: string;
  durationDays?: number;
  durationHours?: number;
  durationMonths?: number;
  lookupKey?: Partial<Record<StripeEnv, string>>;
  priceId?: Partial<Record<StripeEnv, string>>;
  productId: Partial<Record<StripeEnv, string>>;
};

const PRICE_ALIASES: Record<string, CanonicalPriceId> = {
  premium: "premium_monthly",
  premium_monthly: "premium_monthly",
  premium_quarterly: "premium_quarterly",
  premium_annual: "premium_annual",
  premium_yearly: "premium_annual",
  message_pass: "message_pass_24h",
  message_pass_24h: "message_pass_24h",
  pass_24h: "message_pass_24h",
  message_pass_2w: "message_pass_2w",
  pass_2w: "message_pass_2w",
};

// Reconciled against the active Stripe catalog on 2026-06-11. Web checkout uses
// Stripe only; iOS StoreKit products remain routed through RevenueCat.
const PRICE_META: Record<CanonicalPriceId, PriceCatalogItem> = {
  premium_monthly: {
    kind: "premium_subscription",
    lookupKey: { sandbox: "premium_monthly" },
    priceId: { live: "price_1TgrEpHf3gYicX76S4PiXjqK" },
    productId: { live: "prod_UdQ7Wabs5PYMko", sandbox: "prod_UdKLIDEDA922D2" },
  },
  premium_quarterly: {
    kind: "premium_subscription",
    durationMonths: 3,
    lookupKey: { sandbox: "premium_quarterly", live: "premium_quarterly" },
    priceId: { live: "price_1Th9fZHf3gYicX761AMjRVsb" },
    productId: { live: "prod_UdQ7puaj1mqoYZ", sandbox: "prod_UdKLATcdzAm3Uq" },
  },
  premium_annual: {
    kind: "premium_subscription",
    lookupKey: { sandbox: "premium_annual", live: "premium_yearly" },
    priceId: { live: "price_1Te9HDHf3gYicX76gz60M4SK" },
    productId: { live: "prod_UdQ71vCnkeB5y7", sandbox: "prod_UdKLXODhYTpQP5" },
  },
  message_pass_24h: {
    kind: "message_pass_24h",
    durationHours: 24,
    lookupKey: { sandbox: "message_pass_24h", live: "message_pass_24h" },
    priceId: { live: "price_1TeHfRHf3gYicX76NjklNghq" },
    productId: { live: "prod_UdYmbpjU7EFtnR", sandbox: "prod_UdSH4eqyBt5CJ2" },
  },
  message_pass_2w: {
    kind: "message_pass_2w",
    durationHours: 336,
    lookupKey: { sandbox: "message_pass_2w", live: "message_pass_2w" },
    priceId: { live: "price_1Tgu2THf3gYicX76yNut3m5o" },
    productId: { live: "prod_UgGZWfjOjP990v", sandbox: "prod_UgF0nzmF2tnfFM" },
  },
};

async function resolveCatalogPrice(
  stripe: ReturnType<typeof createStripeClient>,
  env: StripeEnv,
  priceId: CanonicalPriceId,
) {
  const meta = PRICE_META[priceId];
  const explicitPriceId = meta.priceId?.[env];
  if (explicitPriceId) {
    return stripe.prices.retrieve(explicitPriceId, { expand: ["product"] });
  }
  const lookupKey = meta.lookupKey?.[env] ?? priceId;
  const prices = await stripe.prices.list({ active: true, lookup_keys: [lookupKey], expand: ["data.product"], limit: 1 });
  if (!prices.data.length) throw new Error(`Price not found for ${lookupKey}`);
  return prices.data[0];
}

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
  // Return raw — URL.toString() percent-encodes `{CHECKOUT_SESSION_ID}`,
  // which breaks Stripe's server-side placeholder substitution.
  return raw;
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
    const canonicalPriceId = PRICE_ALIASES[data.priceId];
    if (!canonicalPriceId || !PRICE_META[canonicalPriceId]) throw new Error("This product is no longer available.");
    data.priceId = canonicalPriceId;
    if (data.customerEmail && data.customerEmail.length > 254) throw new Error("Invalid email");
    data.returnUrl = validateReturnUrl(data.returnUrl);
    return data as typeof data & { priceId: CanonicalPriceId };
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

      const stripePrice = await resolveCatalogPrice(stripe, data.environment, data.priceId);
      const isRecurring = stripePrice.type === "recurring";
      const meta = PRICE_META[data.priceId] ?? { kind: "other" };

      const actualProductId = typeof stripePrice.product === "string"
        ? stripePrice.product
        : (stripePrice.product as any).id;
      const expectedProductId = meta.productId?.[data.environment];
      if (expectedProductId && actualProductId !== expectedProductId) {
        throw new Error(`Product mismatch for ${data.priceId}`);
      }

      const customerId = await resolveOrCreateCustomer(stripe, { email, userId });

      let productDescription: string | undefined;
      if (!isRecurring) {
        const product = typeof stripePrice.product === "string"
          ? await stripe.products.retrieve(actualProductId)
          : stripePrice.product as any;
        productDescription = product.name;
      }

      const sharedMeta: Record<string, string> = {
        kind: meta.kind,
        priceId: data.priceId,
        userId, // server-verified from JWT
      };
      if (meta.durationDays) sharedMeta.durationDays = String(meta.durationDays);
      if (meta.durationHours) sharedMeta.durationHours = String(meta.durationHours);
      if (meta.durationMonths) sharedMeta.durationMonths = String(meta.durationMonths);

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
