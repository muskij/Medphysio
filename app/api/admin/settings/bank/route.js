import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../lib/auth";
import { getBankDetails, setBankDetails } from "../../../../../lib/queries";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ bank: getBankDetails() });
}

export async function POST(req) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { bankName, accountName, accountNumber, note } = await req.json().catch(() => ({}));
  if (!bankName || !accountName || !accountNumber) {
    return NextResponse.json({ error: "Bank name, account name and account number are required." }, { status: 400 });
  }
  setBankDetails({ bankName, accountName, accountNumber, note });
  return NextResponse.json({ ok: true, bank: getBankDetails() });
}
