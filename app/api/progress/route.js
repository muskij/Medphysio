import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { newId } from "../../../lib/ids";
import { getLessonProgress } from "../../../lib/queries";

const REQUIRED_TABS = ["mini", "voice", "full", "answer", "quiz"];

export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const { lessonId, tab } = await req.json().catch(() => ({}));
  if (!lessonId || !tab) return NextResponse.json({ error: "lessonId and tab are required." }, { status: 400 });

  const existing = getLessonProgress(user.id, lessonId);
  const tabsDone = new Set(existing ? JSON.parse(existing.tabs_completed || "[]") : []);
  tabsDone.add(tab);
  const allDone = REQUIRED_TABS.every((t) => tabsDone.has(t));

  if (existing) {
    db.prepare(
      `UPDATE lesson_progress SET tabs_completed = ?, completed_at = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(JSON.stringify([...tabsDone]), allDone ? new Date().toISOString() : existing.completed_at, existing.id);
  } else {
    db.prepare(
      `INSERT INTO lesson_progress (id, user_id, lesson_id, tabs_completed, completed_at) VALUES (?, ?, ?, ?, ?)`
    ).run(newId(), user.id, lessonId, JSON.stringify([...tabsDone]), allDone ? new Date().toISOString() : null);
  }

  return NextResponse.json({ ok: true, tabsDone: [...tabsDone] });
}
