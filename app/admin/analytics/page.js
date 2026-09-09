import { getSessionUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import AnalyticsCharts from "./AnalyticsCharts";

export default async function AnalyticsPage() {
  const user = await getSessionUser();
  const lecturerFilter = user.role === "LECTURER" ? "WHERE c.lecturer_id = ?" : "";
  const args = user.role === "LECTURER" ? [user.id] : [];

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
    .all(...args)
    .map((c) => ({ ...c, avg_quiz_pct: c.avg_quiz_pct || 0 }));

  const revenueMinor =
    user.role === "ADMIN"
      ? db.prepare(`SELECT COALESCE(SUM(amount_minor), 0) AS revenue FROM subscription_payments`).get().revenue
      : null;
  const activeSubscribers =
    user.role === "ADMIN"
      ? db
          .prepare(`SELECT subscription_expires_at FROM users WHERE subscription_expires_at IS NOT NULL`)
          .all()
          .filter((u) => new Date(u.subscription_expires_at).getTime() > Date.now()).length
      : null;

  const totalEnrollments = perCourse.reduce((a, c) => a + c.enrollments, 0);
  const totalCompletions = perCourse.reduce((a, c) => a + c.completions, 0);

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>Analytics</h1>
          <p>Enrollment, revenue and quiz performance across your courses.</p>
        </div>
      </div>

      <div className="admin-stats">
        <div className="admin-stat">
          <strong>{totalEnrollments}</strong>
          <span>Students who started a course</span>
        </div>
        <div className="admin-stat">
          <strong>{totalCompletions}</strong>
          <span>Lessons completed</span>
        </div>
        {user.role === "ADMIN" && (
          <>
            <div className="admin-stat">
              <strong>{activeSubscribers}</strong>
              <span>Active subscribers</span>
            </div>
            <div className="admin-stat">
              <strong>{(revenueMinor / 100).toLocaleString()}</strong>
              <span>Revenue collected (minor units)</span>
            </div>
          </>
        )}
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Performance by course</h3>
        <AnalyticsCharts perCourse={perCourse} />
      </div>
    </>
  );
}
