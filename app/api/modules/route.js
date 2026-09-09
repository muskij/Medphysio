import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { newId } from "../../../lib/ids";
import { getCourseById, getModulesForCourse } from "../../../lib/queries";

function canEdit(user, course) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.role === "LECTURER" && course.lecturer_id === user.id;
}

export async function POST(req) {
  const user = await getSessionUser();
  const { courseId, title } = await req.json().catch(() => ({}));
  const course = getCourseById(courseId);
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  if (!canEdit(user, course)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

  const position = getModulesForCourse(courseId).length;
  const id = newId();
  db.prepare("INSERT INTO modules (id, course_id, title, position) VALUES (?, ?, ?, ?)").run(
    id,
    courseId,
    title,
    position
  );
  return NextResponse.json({ id });
}
