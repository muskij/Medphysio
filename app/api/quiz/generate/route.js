import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { newId } from "../../../../lib/ids";
import { getCourseById, getLessonById, getQuizQuestions } from "../../../../lib/queries";
import { generateQuizQuestions } from "../../../../lib/ai";

function canEdit(user, course) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.role === "LECTURER" && course.lecturer_id === user.id;
}

// body: { lessonId, count }
// Generates `count` AI-written questions grounded in the lesson's mini-text
// and inserts them straight into the quiz bank, same as a manually-added
// question would be. Returns the lesson's full, up-to-date question list so
// the admin quiz builder can just replace its local state wholesale.
export async function POST(req) {
  const user = await getSessionUser();
  const { lessonId, count = 5 } = await req.json().catch(() => ({}));

  const lesson = getLessonById(lessonId);
  if (!lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  const course = getCourseById(lesson.course_id);
  if (!canEdit(user, course)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await generateQuizQuestions({
    lessonTitle: lesson.title,
    courseTitle: course.title,
    lessonHtml: lesson.mini_text_html,
    count,
  });

  if (result.error) {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  const startPosition = getQuizQuestions(lessonId).length;
  const insertQuestion = db.prepare(
    "INSERT INTO quiz_questions (id, lesson_id, question, explanation, position) VALUES (?, ?, ?, ?, ?)"
  );
  const insertOption = db.prepare(
    "INSERT INTO quiz_options (id, question_id, label, text, is_correct, position) VALUES (?, ?, ?, ?, ?, ?)"
  );

  db.transaction(() => {
    result.questions.forEach((q, qi) => {
      const questionId = newId();
      insertQuestion.run(questionId, lessonId, q.question, q.explanation, startPosition + qi);
      q.options.forEach((opt, oi) => {
        insertOption.run(newId(), questionId, opt.label, opt.text, opt.isCorrect ? 1 : 0, oi);
      });
    });
  })();

  return NextResponse.json({ questions: getQuizQuestions(lessonId), generatedCount: result.questions.length });
}
