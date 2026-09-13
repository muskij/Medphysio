import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { newId } from "../../../../lib/ids";
import { getQuizQuestions, getLessonProgress } from "../../../../lib/queries";

const REQUIRED_TABS = ["mini", "voice", "full", "answer", "quiz"];

export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const { lessonId, answers } = await req.json().catch(() => ({}));
  if (!lessonId || !Array.isArray(answers)) {
    return NextResponse.json({ error: "lessonId and answers are required." }, { status: 400 });
  }

  const questions = getQuizQuestions(lessonId);
  if (!questions.length) return NextResponse.json({ error: "This lesson has no quiz questions." }, { status: 400 });

  let score = 0;
  const feedback = {};
  for (const q of questions) {
    const correctOption = q.options.find((o) => o.is_correct);
    const submitted = answers.find((a) => a.questionId === q.id);
    const correct = !!(submitted && correctOption && submitted.optionId === correctOption.id);
    if (correct) score += 1;
    feedback[q.id] = {
      correct,
      correctOptionId: correctOption?.id || null,
      explanation: q.explanation || "",
    };
  }

  const total = questions.length;

  // Update progress: mark quiz tab done, track best score & attempts.
  const existing = getLessonProgress(user.id, lessonId);
  const tabsDone = new Set(existing ? JSON.parse(existing.tabs_completed || "[]") : []);
  tabsDone.add("quiz");
  const allDone = REQUIRED_TABS.every((t) => tabsDone.has(t));
  const bestScore = existing?.quiz_best_score != null ? Math.max(existing.quiz_best_score, score) : score;

  if (existing) {
    db.prepare(
      `UPDATE lesson_progress
       SET tabs_completed = ?, quiz_best_score = ?, quiz_total = ?, quiz_attempts = quiz_attempts + 1,
           completed_at = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(JSON.stringify([...tabsDone]), bestScore, total, allDone ? new Date().toISOString() : existing.completed_at, existing.id);
  } else {
    db.prepare(
      `INSERT INTO lesson_progress (id, user_id, lesson_id, tabs_completed, quiz_best_score, quiz_total, quiz_attempts, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
    ).run(newId(), user.id, lessonId, JSON.stringify([...tabsDone]), score, total, allDone ? new Date().toISOString() : null);
  }

  return NextResponse.json({ score, total, feedback });
}
