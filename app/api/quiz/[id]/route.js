import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { newId } from "../../../../lib/ids";
import { getCourseById, getLessonById } from "../../../../lib/queries";

function getQuestion(id) {
  return db.prepare("SELECT * FROM quiz_questions WHERE id = ?").get(id);
}

function canEdit(user, course) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.role === "LECTURER" && course.lecturer_id === user.id;
}

// body: { question, explanation, options: [{label, text, isCorrect}] } - options optional (replaces all if present)
export async function PATCH(req, { params }) {
  const user = await getSessionUser();
  const q = getQuestion(params.id);
  if (!q) return NextResponse.json({ error: "Question not found." }, { status: 404 });
  const lesson = getLessonById(q.lesson_id);
  const course = getCourseById(lesson.course_id);
  if (!canEdit(user, course)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  db.transaction(() => {
    const fields = [];
    const values = [];
    if (body.question !== undefined) {
      fields.push("question = ?");
      values.push(body.question);
    }
    if (body.explanation !== undefined) {
      fields.push("explanation = ?");
      values.push(body.explanation);
    }
    if (fields.length) {
      values.push(params.id);
      db.prepare(`UPDATE quiz_questions SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    }
    if (Array.isArray(body.options)) {
      db.prepare("DELETE FROM quiz_options WHERE question_id = ?").run(params.id);
      const insertOption = db.prepare(
        "INSERT INTO quiz_options (id, question_id, label, text, is_correct, position) VALUES (?, ?, ?, ?, ?, ?)"
      );
      body.options.forEach((opt, i) => {
        insertOption.run(newId(), params.id, opt.label || String.fromCharCode(65 + i), opt.text, opt.isCorrect ? 1 : 0, i);
      });
    }
  })();

  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const user = await getSessionUser();
  const q = getQuestion(params.id);
  if (!q) return NextResponse.json({ error: "Question not found." }, { status: 404 });
  const lesson = getLessonById(q.lesson_id);
  const course = getCourseById(lesson.course_id);
  if (!canEdit(user, course)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  db.prepare("DELETE FROM quiz_questions WHERE id = ?").run(params.id);
  return NextResponse.json({ ok: true });
}
