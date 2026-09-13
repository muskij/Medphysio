import { db } from "./db.js";
import { newId } from "./ids.js";
import { accessWindowDays } from "./paystack.js";

// Idempotent: safe to call once from the webhook and once from the callback
// verify route for the same payment, since `reference` is UNIQUE.
export function activateSubscriptionFromPayment({
  userId,
  reference,
  amountMinor,
  currency,
  planCode,
  customerCode,
  planIntervalDays, // if the event told us the actual plan interval, prefer it
}) {
  const already = db.prepare("SELECT id FROM subscription_payments WHERE reference = ?").get(reference);
  if (already) return { alreadyProcessed: true };

  const days = planIntervalDays || accessWindowDays();
  const user = db.prepare("SELECT subscription_expires_at FROM users WHERE id = ?").get(userId);
  const currentExpiry = user?.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
  const base = currentExpiry && currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
  const newExpiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  db.prepare(
    `UPDATE users SET subscription_status = 'ACTIVE', subscription_expires_at = ?, paystack_customer_code = COALESCE(?, paystack_customer_code) WHERE id = ?`
  ).run(newExpiry.toISOString(), customerCode || null, userId);

  db.prepare(
    `INSERT INTO subscription_payments (id, user_id, reference, amount_minor, currency, plan_code, period_end)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(newId(), userId, reference, amountMinor, currency || "NGN", planCode || null, newExpiry.toISOString());

  return { alreadyProcessed: false, expiresAt: newExpiry.toISOString() };
}

export function markSubscriptionCancelled(customerCode) {
  if (!customerCode) return;
  db.prepare(`UPDATE users SET subscription_status = 'CANCELLED' WHERE paystack_customer_code = ?`).run(customerCode);
}
