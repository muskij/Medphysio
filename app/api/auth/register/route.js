import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { newId } from "../../../../lib/ids";
import { hashPassword, createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "../../../../lib/auth";
import { getUserByEmail } from "../../../../lib/queries";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { name, email, password } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (getUserByEmail(email)) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const id = newId();
  const passwordHash = await hashPassword(password);
  db.prepare(
    "INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'STUDENT')"
  ).run(id, name.trim(), email.toLowerCase().trim(), passwordHash);

  const token = await createSessionToken({ id, name, email, role: "STUDENT" });
  const res = NextResponse.json({ user: { id, name, email, role: "STUDENT" } });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
