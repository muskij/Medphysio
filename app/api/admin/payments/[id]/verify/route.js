import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../../lib/auth";
import { db } from "../../../../../../lib/db";
import { getPaymentSubmissionById } from "../../../../../../lib/queries";
import { activateSubscriptionFromPayment } from "../../../../../../lib/subscriptions";

export async function POST(req, { params }) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const submission = getPaymentSubmissionById(params.id);
  if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  if (submission.status === "VERIFIED") {
    return NextResponse.json({ error: "This payment has already been verified." }, { status: 409 });
  }

  const amountMinor = Math.round(Number(submission.amount) * 100) || 0;

  const result = activateSubscriptionFromPayment({
    userId: submission.user_id,
    reference: `banktransfer:${submission.id}`,
    amountMinor,
    currency: "NGN",
    planCode: null,
    customerCode: null,
    planIntervalDays: null,
  });

  db.prepare(
    `UPDATE payment_submissions SET status = 'VERIFIED', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?`
  ).run(user.id, submission.id);

  return NextResponse.json({ ok: true, ...result });
}
