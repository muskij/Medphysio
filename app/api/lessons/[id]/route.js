import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { getCourseById, getLessonById, getQuizQuestions } from "../../../../lib/queries";

function canEdit(user, course) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.role === "LECTURER" && course.lecturer_id === user.id;
}

const EDITABLE_FIELDS = [
  "title",
  "free_preview",
  "mini_text_html",
  "voice_embed_url",
  "voice_link_url",
  "video_embed_url",
  "video_link_url",
  "video_title",
  "video_desc",
  "answer_embed_url",
  "answer_link_url",
  "answer_title",
  "answer_desc",
];

export async function GET(req, { params }) {
  const user = await getSessionUser();
  const lesson = getLessonById(params.id);
  if (!lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  const course = getCourseById(lesson.course_id);
  if (!canEdit(user, course)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const questions = getQuizQuestions(lesson.id);
  return NextResponse.json({ lesson, questions });
}

export async function PATCH(req, { params }) {
  const user = await getSessionUser();
  const lesson = getLessonById(params.id);
  if (!lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  const course = getCourseById(lesson.course_id);
  if (!canEdit(user, course)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const fields = [];
  const values = [];
  for (const key of EDITABLE_FIELDS) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(key === "free_preview" ? (body[key] ? 1 : 0) : body[key]);
    }
  }
  if (!fields.length) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  values.push(params.id);
  db.prepare(`UPDATE lessons SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const user = await getSessionUser();
  const lesson = getLessonById(params.id);
  if (!lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  const course = getCourseById(lesson.course_id);
  if (!canEdit(user, course)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  db.prepare("DELETE FROM lessons WHERE id = ?").run(params.id);
  return NextResponse.json({ ok: true });
}
