import { NextResponse } from "next/server";
import { getSessionUser, hashPassword } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { newId } from "../../../lib/ids";
import { listLecturers, getUserByEmail } from "../../../lib/queries";

function genPassword() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ lecturers: listLecturers() });
}

export async function POST(req) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, email } = await req.json().catch(() => ({}));
  if (!name || !email) return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  if (getUserByEmail(email)) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });

  const tempPassword = genPassword();
  const id = newId();
  const passwordHash = await hashPassword(tempPassword);
  db.prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'LECTURER')").run(
    id,
    name.trim(),
    email.toLowerCase().trim(),
    passwordHash
  );

  return NextResponse.json({ id, tempPassword });
}
