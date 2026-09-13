import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../../lib/auth";
import { db } from "../../../../../../lib/db";
import { getPaymentSubmissionById } from "../../../../../../lib/queries";

export async function POST(req, { params }) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const submission = getPaymentSubmissionById(params.id);
  if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });

  const { note } = await req.json().catch(() => ({}));

  db.prepare(
    `UPDATE payment_submissions
     SET status = 'REJECTED', reviewed_by = ?, reviewed_at = datetime('now'), review_note = ?
     WHERE id = ?`
  ).run(user.id, note || "", submission.id);

  return NextResponse.json({ ok: true });
}
