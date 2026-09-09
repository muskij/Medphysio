import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { paystackConfigured, initializeTransaction } from "../../../../lib/paystack";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  if (!paystackConfigured()) {
    return NextResponse.json(
      { error: "Payments aren't configured yet. Set PAYSTACK_SECRET_KEY in your environment." },
      { status: 501 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const data = await initializeTransaction({
      email: user.email,
      userId: user.id,
      callbackUrl: `${siteUrl}/subscribe/success`,
    });
    return NextResponse.json({ url: data.authorization_url });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
