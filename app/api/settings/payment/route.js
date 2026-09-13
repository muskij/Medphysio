import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { getBankDetails, setBankDetails } from "../../../../lib/settings";

export async function GET() {
  return NextResponse.json({ bankDetails: getBankDetails() });
}

export async function PATCH(req) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { bankName, accountName, accountNumber, instructions = "" } = body;
  if (!bankName || !accountName || !accountNumber) {
    return NextResponse.json({ error: "Bank name, account name and account number are all required." }, { status: 400 });
  }

  setBankDetails({ bankName, accountName, accountNumber, instructions });
  return NextResponse.json({ ok: true });
}
