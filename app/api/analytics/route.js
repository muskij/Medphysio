import { NextResponse } from "next/server";
import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !["ADMIN", "LECTURER"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const lecturerFilter = user.role === "LECTURER" ? "WHERE c.lecturer_id = ?" : "";
  const args = user.role === "LECTURER" ? [user.id] : [];

  const totals = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM courses c ${lecturerFilter}) AS course_count,
        (SELECT COUNT(*) FROM enrollments e JOIN courses c ON e.course_id = c.id ${lecturerFilter} ${
        lecturerFilter ? "AND" : "WHERE"
      } e.status = 'ACTIVE') AS active_enrollments
      `
    )
    .get(...args);

  if (user.role === "ADMIN") {
    totals.revenue_minor = db.prepare(`SELECT COALESCE(SUM(amount_minor), 0) AS n FROM subscription_payments`).get().n;
    totals.active_subscribers = db
      .prepare(`SELECT subscription_expires_at FROM users WHERE subscription_expires_at IS NOT NULL`)
      .all()
      .filter((u) => new Date(u.subscription_expires_at).getTime() > Date.now()).length;
  }

  const perCourse = db
    .prepare(
      `SELECT c.id, c.title,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'ACTIVE') AS enrollments,
        (SELECT ROUND(AVG(CAST(lp.quiz_best_score AS FLOAT) / NULLIF(lp.quiz_total, 0)) * 100)
           FROM lesson_progress lp
           JOIN lessons l ON lp.lesson_id = l.id
           JOIN modules m ON l.module_id = m.id
           WHERE m.course_id = c.id AND lp.quiz_total IS NOT NULL) AS avg_quiz_pct,
        (SELECT COUNT(*) FROM lesson_progress lp
           JOIN lessons l ON lp.lesson_id = l.id
           JOIN modules m ON l.module_id = m.id
           WHERE m.course_id = c.id AND lp.completed_at IS NOT NULL) AS completions
      FROM courses c ${lecturerFilter}
      ORDER BY enrollments DESC`
    )
    .all(...args);

  return NextResponse.json({
    totals,
    perCourse: perCourse.map((c) => ({ ...c, avg_quiz_pct: c.avg_quiz_pct || 0 })),
  });
}
