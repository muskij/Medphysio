import { NextResponse } from "next/server";
import crypto from "crypto";
import { activateSubscriptionFromPayment, markSubscriptionCancelled } from "../../../../lib/subscriptions";

const PLAN_INTERVAL_DAYS = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  biannually: 182,
  annually: 365,
};

export async function POST(req) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Paystack not configured" }, { status: 501 });

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");

  if (!signature || signature !== expected) {
    console.error("Paystack webhook signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    const data = event.data;
    const userId = data.metadata?.userId;
    if (userId) {
      activateSubscriptionFromPayment({
        userId,
        reference: data.reference,
        amountMinor: data.amount,
        currency: data.currency,
        planCode: data.plan?.plan_code,
        customerCode: data.customer?.customer_code,
        planIntervalDays: PLAN_INTERVAL_DAYS[data.plan?.interval] || null,
      });
    }
  }

  if (event.event === "subscription.disable" || event.event === "subscription.not_renew") {
    markSubscriptionCancelled(event.data.customer?.customer_code);
  }

  return NextResponse.json({ received: true });
}
