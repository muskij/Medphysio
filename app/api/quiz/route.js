import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { newId } from "../../../lib/ids";
import { getCourseById, getLessonById, getQuizQuestions } from "../../../lib/queries";

function canEdit(user, course) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.role === "LECTURER" && course.lecturer_id === user.id;
}

// body: { lessonId, question, explanation, options: [{label, text, isCorrect}] }
export async function POST(req) {
  const user = await getSessionUser();
  const body = await req.json().catch(() => ({}));
  const { lessonId, question, explanation = "", options = [] } = body;

  const lesson = getLessonById(lessonId);
  if (!lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  const course = getCourseById(lesson.course_id);
  if (!canEdit(user, course)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!question || options.length < 2) {
    return NextResponse.json({ error: "A question and at least 2 options are required." }, { status: 400 });
  }
  if (!options.some((o) => o.isCorrect)) {
    return NextResponse.json({ error: "Mark one option as correct." }, { status: 400 });
  }

  const position = getQuizQuestions(lessonId).length;
  const questionId = newId();
  const insertQuestion = db.prepare(
    "INSERT INTO quiz_questions (id, lesson_id, question, explanation, position) VALUES (?, ?, ?, ?, ?)"
  );
  const insertOption = db.prepare(
    "INSERT INTO quiz_options (id, question_id, label, text, is_correct, position) VALUES (?, ?, ?, ?, ?, ?)"
  );

  db.transaction(() => {
    insertQuestion.run(questionId, lessonId, question, explanation, position);
    options.forEach((opt, i) => {
      insertOption.run(newId(), questionId, opt.label || String.fromCharCode(65 + i), opt.text, opt.isCorrect ? 1 : 0, i);
    });
  })();

  return NextResponse.json({ id: questionId });
}
