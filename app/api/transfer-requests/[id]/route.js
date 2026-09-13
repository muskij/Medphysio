import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { getTransferRequestById } from "../../../../lib/queries";
import { getSubscriptionPricing } from "../../../../lib/pricing";
import { activateSubscriptionFromPayment } from "../../../../lib/subscriptions";

// body: { action: 'verify' | 'reject', reason? }
export async function PATCH(req, { params }) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const request_ = getTransferRequestById(params.id);
  if (!request_) return NextResponse.json({ error: "Transfer request not found." }, { status: 404 });
  if (request_.status !== "PENDING") {
    return NextResponse.json({ error: `This request was already ${request_.status.toLowerCase()}.` }, { status: 409 });
  }

  const { action, reason = "" } = await req.json().catch(() => ({}));

  if (action === "reject") {
    db.prepare(
      `UPDATE transfer_requests SET status = 'REJECTED', reviewed_by = ?, reviewed_at = datetime('now'), rejection_reason = ? WHERE id = ?`
    ).run(user.id, reason, params.id);
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  if (action === "verify") {
    const { amountMinor, currency } = getSubscriptionPricing();
    const result = activateSubscriptionFromPayment({
      userId: request_.user_id,
      reference: `MANUAL-${request_.id}`,
      amountMinor: request_.amount_minor || amountMinor,
      currency,
    });
    db.prepare(
      `UPDATE transfer_requests SET status = 'VERIFIED', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?`
    ).run(user.id, params.id);
    return NextResponse.json({ ok: true, status: "VERIFIED", ...result });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
