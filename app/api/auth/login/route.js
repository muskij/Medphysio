import { NextResponse } from "next/server";
import { verifyPassword, createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "../../../../lib/auth";
import { getUserByEmail } from "../../../../lib/queries";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await createSessionToken(user);
  const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
