import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { getCourseById } from "../../../../lib/queries";

function getModule(id) {
  return db.prepare("SELECT * FROM modules WHERE id = ?").get(id);
}

function canEdit(user, course) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.role === "LECTURER" && course.lecturer_id === user.id;
}

export async function PATCH(req, { params }) {
  const user = await getSessionUser();
  const mod = getModule(params.id);
  if (!mod) return NextResponse.json({ error: "Module not found." }, { status: 404 });
  const course = getCourseById(mod.course_id);
  if (!canEdit(user, course)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const fields = [];
  const values = [];
  if (body.title !== undefined) {
    fields.push("title = ?");
    values.push(body.title);
  }
  if (body.position !== undefined) {
    fields.push("position = ?");
    values.push(Number(body.position) || 0);
  }
  if (!fields.length) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  values.push(params.id);
  db.prepare(`UPDATE modules SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const user = await getSessionUser();
  const mod = getModule(params.id);
  if (!mod) return NextResponse.json({ error: "Module not found." }, { status: 404 });
  const course = getCourseById(mod.course_id);
  if (!canEdit(user, course)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  db.prepare("DELETE FROM modules WHERE id = ?").run(params.id);
  return NextResponse.json({ ok: true });
}
