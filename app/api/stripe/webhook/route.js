import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe";
import { db } from "../../../../lib/db";
import { newId } from "../../../../lib/ids";

export async function POST(req) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });

  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { userId, courseId } = session.metadata || {};
    if (userId && courseId) {
      db.prepare(
        `INSERT INTO enrollments (id, user_id, course_id, status, stripe_session_id)
         VALUES (?, ?, ?, 'ACTIVE', ?)
         ON CONFLICT(user_id, course_id) DO UPDATE SET status = 'ACTIVE', stripe_session_id = excluded.stripe_session_id`
      ).run(newId(), userId, courseId, session.id);
    }
  }

  return NextResponse.json({ received: true });
}
