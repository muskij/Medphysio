import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { newId } from "../../../lib/ids";
import { getCourseById } from "../../../lib/queries";

export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { courseId } = await req.json().catch(() => ({}));
  const course = getCourseById(courseId);
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  if (course.price_cents !== 0) {
    return NextResponse.json({ error: "This course requires payment." }, { status: 400 });
  }

  db.prepare(
    `INSERT INTO enrollments (id, user_id, course_id, status)
     VALUES (?, ?, ?, 'ACTIVE')
     ON CONFLICT(user_id, course_id) DO UPDATE SET status = 'ACTIVE'`
  ).run(newId(), user.id, courseId);

  return NextResponse.json({ ok: true });
}
