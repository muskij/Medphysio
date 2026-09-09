import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getSessionUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { getCourseTree, getCourseProgress } from "../../lib/queries";

export default async function DashboardPage() {
  const user = await getSessionUser();

  const enrollments = db
    .prepare(
      `SELECT e.*, c.title, c.slug, c.description FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = ? AND e.status = 'ACTIVE'
       ORDER BY e.created_at DESC`
    )
    .all(user.id);

  const cards = enrollments.map((enr) => {
    const modules = getCourseTree(enr.course_id);
    const totalLessons = modules.reduce((a, m) => a + m.lessons.length, 0);
    const progress = getCourseProgress(user.id, enr.course_id);
    const completed = progress.filter((p) => p.completed_at).length;
    const firstLesson = modules[0]?.lessons[0];
    return { ...enr, totalLessons, completed, firstLesson };
  });

  return (
    <main>
      <SiteHeader user={user} />
      <section className="section" style={{ paddingTop: 60 }}>
        <div className="section-heading">
          <div>
            <span className="kicker">Welcome back</span>
            <h2>Hi {user.name.split(" ")[0]}, keep the momentum going.</h2>
          </div>
        </div>

        {(user.role === "ADMIN" || user.role === "LECTURER") && (
          <p style={{ marginBottom: 30 }}>
            You&rsquo;re logged in as a {user.role.toLowerCase()}.{" "}
            <Link href="/admin" style={{ color: "var(--teal)", fontWeight: 700 }}>
              Go to the admin panel &#8594;
            </Link>
          </p>
        )}

        {cards.length === 0 ? (
          <p style={{ color: "#718589" }}>
            You&rsquo;re not enrolled in any courses yet.{" "}
            <Link href="/#courses" style={{ color: "var(--teal)", fontWeight: 700 }}>
              Browse courses &#8594;
            </Link>
          </p>
        ) : (
          <div className="system-grid">
            {cards.map((c) => {
              const pct = c.totalLessons ? Math.round((c.completed / c.totalLessons) * 100) : 0;
              return (
                <div className="system-card teal" key={c.id} style={{ cursor: "default" }}>
                  <div className="system-top">
                    <span className="system-icon">&#9707;</span>
                  </div>
                  <span className="course-count">
                    {c.completed}/{c.totalLessons} lessons complete
                  </span>
                  <h3>{c.title}</h3>
                  <p>{c.description}</p>
                  <div className="tiny-progress">
                    <span style={{ width: `${pct}%` }}></span>
                  </div>
                  {c.firstLesson && (
                    <Link
                      className="button small"
                      style={{ marginTop: 14, display: "inline-flex" }}
                      href={`/courses/${c.slug}/${c.firstLesson.slug}`}
                    >
                      {c.completed > 0 ? "Continue" : "Start"} &#8594;
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
