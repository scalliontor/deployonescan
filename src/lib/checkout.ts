/**
 * Mock checkout — Vercel-safe (in-memory only).
 *
 * Pretends to be Stripe Checkout. Returns a synthetic session id and a
 * redirect URL to /checkout/success?session_id=…
 *
 * Sessions are tracked in a module-level Map for the duration of a single
 * serverless instance — good enough for the demo's "click pay → land on
 * success" flow. Real production swaps this for the Stripe SDK.
 */

declare global {
  // eslint-disable-next-line no-var
  var __onescanCheckout: Map<string, Session> | undefined;
}

export type PlanId = "per_tour" | "starter" | "pro";

export const PLANS: Record<
  PlanId,
  { name: string; price: number; cadence: string; description: string; cta: string }
> = {
  per_tour: {
    name: "Pay per tour",
    price: 29,
    cadence: "/tour",
    description: "Best for occasional listings. Pay only when you publish.",
    cta: "Start a tour",
  },
  starter: {
    name: "Starter",
    price: 39,
    cadence: "/month",
    description: "5 tours/month. Branded share links. Lead capture.",
    cta: "Start free trial",
  },
  pro: {
    name: "Pro",
    price: 99,
    cadence: "/month",
    description: "Unlimited tours. White-label embeds. Floor plans. Priority processing.",
    cta: "Start free trial",
  },
};

type Session = {
  id: string;
  plan: PlanId;
  status: "open" | "complete";
  createdAt: number;
  customerEmail?: string;
};

const SESSIONS: Map<string, Session> =
  globalThis.__onescanCheckout ?? (globalThis.__onescanCheckout = new Map());

export function createCheckoutSession(plan: PlanId, customerEmail?: string) {
  const id = `cs_mock_${Math.random().toString(36).slice(2, 12)}`;
  SESSIONS.set(id, { id, plan, status: "open", createdAt: Date.now(), customerEmail });
  const appUrl = process.env.PUBLIC_APP_URL || "";
  return {
    id,
    url: `${appUrl}/checkout/success?session_id=${id}`,
  };
}

export function completeCheckoutSession(id: string): Session | null {
  const session = SESSIONS.get(id);
  if (!session) return null;
  session.status = "complete";
  SESSIONS.set(id, session);
  return session;
}

export function getCheckoutSession(id: string): Session | null {
  return SESSIONS.get(id) ?? null;
}
