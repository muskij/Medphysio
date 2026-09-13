import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { newId } from "../../../../lib/ids";
import { getLessonById, getCourseById } from "../../../../lib/queries";
import { askAboutLesson } from "../../../../lib/ai";

export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: true, message: "Please log in to use the AI assistant." }, { status: 401 });

  const { lessonId, question, history = [] } = await req.json().catch(() => ({}));
  if (!lessonId || !question) {
    return NextResponse.json({ error: true, message: "A lessonId and question are required." }, { status: 400 });
  }

  const lesson = getLessonById(lessonId);
  if (!lesson) return NextResponse.json({ error: true, message: "Lesson not found." }, { status: 404 });
  const course = getCourseById(lesson.course_id);

  const result = await askAboutLesson({
    lessonTitle: lesson.title,
    courseTitle: course?.title || "",
    lessonHtml: lesson.mini_text_html,
    question,
    history,
  });

  // Log the exchange for the student's own record (also gives admins a feel for common questions).
  db.prepare(
    `INSERT INTO chat_messages (id, user_id, lesson_id, role, content) VALUES (?, ?, ?, 'user', ?)`
  ).run(newId(), user.id, lessonId, question);
  if (!result.error) {
    db.prepare(
      `INSERT INTO chat_messages (id, user_id, lesson_id, role, content) VALUES (?, ?, ?, 'assistant', ?)`
    ).run(newId(), user.id, lessonId, result.message);
  }

  return NextResponse.json(result, { status: result.error ? 502 : 200 });
}
