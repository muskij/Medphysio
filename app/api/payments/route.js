import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { newId } from "../../../lib/ids";
import { getLatestSubmissionForUser } from "../../../lib/queries";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "receipts");
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

// Returns the current student's latest payment submission, if any.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  const submission = getLatestSubmissionForUser(user.id) || null;
  return NextResponse.json({ submission });
}

// Student declares a bank transfer they made, optionally attaching a receipt.
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });

  const payerName = (form.get("payerName") || "").toString().trim();
  const payerAccountNumber = (form.get("payerAccountNumber") || "").toString().trim();
  const payerBankName = (form.get("payerBankName") || "").toString().trim();
  const amount = (form.get("amount") || "").toString().trim();
  const paidAt = (form.get("paidAt") || "").toString().trim();
  const note = (form.get("note") || "").toString().trim();

  if (!payerName || !payerAccountNumber || !payerBankName) {
    return NextResponse.json(
      { error: "Account name, account number and bank name are required." },
      { status: 400 }
    );
  }

  const id = newId();
  let receiptPath = null;

  const receipt = form.get("receipt");
  if (receipt && typeof receipt === "object" && receipt.size > 0) {
    if (receipt.size > MAX_RECEIPT_BYTES) {
      return NextResponse.json({ error: "Receipt file is too large (max 5MB)." }, { status: 400 });
    }
    if (ALLOWED_TYPES.length && receipt.type && !ALLOWED_TYPES.includes(receipt.type)) {
      return NextResponse.json({ error: "Receipt must be an image or PDF." }, { status: 400 });
    }
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const ext = (receipt.name?.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const filename = `${id}.${ext || "bin"}`;
    const bytes = Buffer.from(await receipt.arrayBuffer());
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), bytes);
    receiptPath = `/uploads/receipts/${filename}`;
  }

  db.prepare(
    `INSERT INTO payment_submissions
      (id, user_id, amount, payer_name, payer_account_number, payer_bank_name, paid_at, note, receipt_path, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`
  ).run(id, user.id, amount, payerName, payerAccountNumber, payerBankName, paidAt, note, receiptPath);

  return NextResponse.json({ id, status: "PENDING" });
}
