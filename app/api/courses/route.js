import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { newId, slugify } from "../../../lib/ids";
import { listCourses } from "../../../lib/queries";

function requireStaff(user) {
  return user && ["ADMIN", "LECTURER"].includes(user.role);
}

export async function GET() {
  const user = await getSessionUser();
  if (!requireStaff(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const all = listCourses();
  const courses = user.role === "ADMIN" ? all : all.filter((c) => c.lecturer_id === user.id);
  return NextResponse.json({ courses });
}

export async function POST(req) {
  const user = await getSessionUser();
  if (!requireStaff(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { title, description = "", priceCents = 0, lecturerId } = body;
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

  let slug = slugify(title);
  const existing = db.prepare("SELECT id FROM courses WHERE slug = ?").get(slug);
  if (existing) slug = `${slug}-${newId().slice(0, 4)}`;

  const id = newId();
  const ownerId = user.role === "LECTURER" ? user.id : lecturerId || null;

  db.prepare(
    `INSERT INTO courses (id, slug, title, description, price_cents, lecturer_id, published)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
  ).run(id, slug, title, description, Number(priceCents) || 0, ownerId);

  return NextResponse.json({ id, slug });
}
