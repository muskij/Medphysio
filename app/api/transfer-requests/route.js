import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { newId } from "../../../lib/ids";
import { getLatestTransferRequest } from "../../../lib/queries";
import { bankDetailsConfigured } from "../../../lib/settings";

export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  if (!bankDetailsConfigured()) {
    return NextResponse.json({ error: "Bank transfer isn't set up yet. Please check back shortly." }, { status: 501 });
  }

  // Don't allow a second submission while one is already pending or verified.
  const existing = getLatestTransferRequest(user.id);
  if (existing && existing.status !== "REJECTED") {
    return NextResponse.json(
      { error: "You already have a transfer request on file. Check its status on the subscribe page." },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { payerName, payerAccountNumber, payerBankName, amountMinor, note = "" } = body;
  if (!payerName || !payerName.trim() || !payerAccountNumber || !payerAccountNumber.trim()) {
    return NextResponse.json({ error: "Account name and account number are required." }, { status: 400 });
  }

  const id = newId();
  db.prepare(
    `INSERT INTO transfer_requests (id, user_id, payer_name, payer_account_number, payer_bank_name, amount_minor, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    user.id,
    payerName.trim(),
    payerAccountNumber.trim(),
    (payerBankName || "").trim(),
    amountMinor ? Number(amountMinor) : null,
    note.trim()
  );

  return NextResponse.json({ id });
}
