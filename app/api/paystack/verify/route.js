import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { verifyTransaction } from "../../../../lib/paystack";
import { activateSubscriptionFromPayment } from "../../../../lib/subscriptions";

const PLAN_INTERVAL_DAYS = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  biannually: 182,
  annually: 365,
};

export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { reference } = await req.json().catch(() => ({}));
  if (!reference) return NextResponse.json({ error: "Missing reference." }, { status: 400 });

  try {
    const data = await verifyTransaction(reference);
    if (data.status !== "success") {
      return NextResponse.json({ error: "Payment was not successful." }, { status: 402 });
    }
    const userId = data.metadata?.userId || user.id;
    const result = activateSubscriptionFromPayment({
      userId,
      reference: data.reference,
      amountMinor: data.amount,
      currency: data.currency,
      planCode: data.plan?.plan_code,
      customerCode: data.customer?.customer_code,
      planIntervalDays: PLAN_INTERVAL_DAYS[data.plan?.interval] || null,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
