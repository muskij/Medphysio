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

  const revenueCents = db
    .prepare(
      `SELECT COALESCE(SUM(c.price_cents), 0) AS revenue FROM enrollments e
       JOIN courses c ON e.course_id = c.id ${lecturerFilter} ${lecturerFilter ? "AND" : "WHERE"} e.status = 'ACTIVE' AND c.price_cents > 0`
    )
    .get(...args).revenue;

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
          <span>Active enrollments</span>
        </div>
        <div className="admin-stat">
          <strong>{totalCompletions}</strong>
          <span>Lessons completed</span>
        </div>
        <div className="admin-stat">
          <strong>${(revenueCents / 100).toFixed(2)}</strong>
          <span>Revenue collected</span>
        </div>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Performance by course</h3>
        <AnalyticsCharts perCourse={perCourse} />
      </div>
    </>
  );
}
