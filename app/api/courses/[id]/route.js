import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { getCourseById } from "../../../../lib/queries";

function canEdit(user, course) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.role === "LECTURER" && course.lecturer_id === user.id;
}

export async function PATCH(req, { params }) {
  const user = await getSessionUser();
  const course = getCourseById(params.id);
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  if (!canEdit(user, course)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const fields = [];
  const values = [];
  for (const [key, col] of [
    ["title", "title"],
    ["description", "description"],
    ["published", "published"],
  ]) {
    if (body[key] !== undefined) {
      fields.push(`${col} = ?`);
      values.push(key === "published" ? (body[key] ? 1 : 0) : body[key]);
    }
  }
  if (body.requiresSubscription !== undefined) {
    fields.push("requires_subscription = ?");
    values.push(body.requiresSubscription ? 1 : 0);
  }
  if (user.role === "ADMIN" && body.lecturerId !== undefined) {
    fields.push("lecturer_id = ?");
    values.push(body.lecturerId || null);
  }
  if (!fields.length) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  values.push(params.id);
  db.prepare(`UPDATE courses SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const user = await getSessionUser();
  const course = getCourseById(params.id);
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  if (!canEdit(user, course)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  db.prepare("DELETE FROM courses WHERE id = ?").run(params.id);
  return NextResponse.json({ ok: true });
}
