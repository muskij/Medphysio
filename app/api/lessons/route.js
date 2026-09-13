import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { newId, slugify } from "../../../lib/ids";
import { getCourseById, getLessonsForModule } from "../../../lib/queries";

function getModule(id) {
  return db.prepare("SELECT * FROM modules WHERE id = ?").get(id);
}

function canEdit(user, course) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.role === "LECTURER" && course.lecturer_id === user.id;
}

export async function POST(req) {
  const user = await getSessionUser();
  const { moduleId, title } = await req.json().catch(() => ({}));
  const mod = getModule(moduleId);
  if (!mod) return NextResponse.json({ error: "Module not found." }, { status: 404 });
  const course = getCourseById(mod.course_id);
  if (!canEdit(user, course)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

  let slug = slugify(title);
  const clash = db
    .prepare(
      `SELECT l.id FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = ? AND l.slug = ?`
    )
    .get(course.id, slug);
  if (clash) slug = `${slug}-${newId().slice(0, 4)}`;

  const position = getLessonsForModule(moduleId).length;
  const id = newId();
  db.prepare("INSERT INTO lessons (id, module_id, slug, title, position) VALUES (?, ?, ?, ?, ?)").run(
    id,
    moduleId,
    slug,
    title,
    position
  );
  return NextResponse.json({ id, slug });
}
