// Thin wrapper around the Paystack REST API for the site-wide subscription flow.
// Docs: https://paystack.com/docs/api/transaction/ and https://paystack.com/docs/payments/subscriptions/

import { getSubscriptionPricing } from "./pricing.js";

const PAYSTACK_BASE = "https://api.paystack.co";

export function paystackConfigured() {
  return !!process.env.PAYSTACK_SECRET_KEY;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

// Creates a hosted payment page the user is redirected to.
export async function initializeTransaction({ email, userId, callbackUrl }) {
  const { amountMinor, currency } = getSubscriptionPricing();
  const planCode = process.env.PAYSTACK_PLAN_CODE || null; // optional: enables auto-renewing subscriptions

  const body = {
    email,
    amount: amountMinor,
    currency,
    callback_url: callbackUrl,
    metadata: { userId },
  };
  if (planCode) body.plan = planCode; // Paystack auto-subscribes the customer to this plan on success

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message || "Could not start the Paystack checkout.");
  }
  return data.data; // { authorization_url, access_code, reference }
}

// Confirms a transaction actually succeeded (used by both the webhook and the
// callback landing page, since webhooks can lag behind the redirect).
export async function verifyTransaction(reference) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message || "Could not verify this transaction with Paystack.");
  }
  return data.data;
}
