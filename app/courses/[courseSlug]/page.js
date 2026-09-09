import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import CourseModules from "./CourseModules";
import { getSessionUser } from "../../../lib/auth";
import { getCourseBySlug, getCourseTree, isSubscribed, getCourseProgress } from "../../../lib/queries";

export default async function CoursePage({ params }) {
  const course = getCourseBySlug(params.courseSlug);
  if (!course) return notFound();

  const user = await getSessionUser();
  const modules = getCourseTree(course.id);
  const totalLessons = modules.reduce((a, m) => a + m.lessons.length, 0);
  const subscribed = user ? isSubscribed(user.id) : false;
  const isFree = !course.requires_subscription;
  const hasFullAccess = isFree || subscribed;

  let completedCount = 0;
  if (user) {
    const progress = getCourseProgress(user.id, course.id);
    completedCount = progress.filter((p) => p.completed_at).length;
  }

  return (
    <main className="course-page">
      <header className="course-nav">
        <Link className="logo" href="/" aria-label="MedPhysio Tutorials home">
          <span className="logo-mark">
            M<span>+</span>
          </span>
          <span className="logo-copy">
            <strong>MedPhysio</strong>
            <small>Tutorials</small>
          </span>
        </Link>
        <div className="course-nav-links">
          <Link href="/">Home</Link>
          <a href="#lessons">Lessons</a>
          {!user && (
            <Link className="course-login" href="/login">
              Student login
            </Link>
          )}
        </div>
      </header>

      <section className="course-hero">
        <div className="blood-art" aria-hidden="true">
          <div className="drop"></div>
        </div>
        <div className="course-hero-copy">
          <Link className="back-link" href="/">
            &#8592; Back to all courses
          </Link>
          <span className="course-kicker">{isFree ? "Free preview" : "Included with subscription"}</span>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
          <div className="course-facts">
            <span>
              <strong>{modules.length}</strong>topics
            </span>
            <span>
              <strong>{totalLessons}</strong>lessons
            </span>
            <span>
              <strong>{course.lecturer_name || "MedPhysio"}</strong>lecturer
            </span>
          </div>
          {!user ? (
            <Link className="button" href={`/register?next=/courses/${course.slug}`}>
              Create free account &#8594;
            </Link>
          ) : hasFullAccess ? (
            modules[0]?.lessons[0] ? (
              <Link className="button" href={`/courses/${course.slug}/${modules[0].lessons[0].slug}`}>
                {completedCount > 0 ? "Continue course" : "Begin the course"} &#8594;
              </Link>
            ) : null
          ) : (
            <Link className="button" href="/subscribe">
              Subscribe for full access &#8594;
            </Link>
          )}
        </div>
      </section>

      <section className="course-path">
        <div>
          <span className="kicker">Your learning pathway</span>
          <h2>
            Five ways to master
            <br />
            <em>every topic.</em>
          </h2>
        </div>
        <div className="format-row">
          <div className="format">
            <span>&#9707;</span>
            <p>
              <strong>Mini-text</strong>
              <small>Quick readable overview</small>
            </p>
            <i>&#8594;</i>
          </div>
          <div className="format">
            <span>&#9835;</span>
            <p>
              <strong>Voice note</strong>
              <small>Listen and revise</small>
            </p>
            <i>&#8594;</i>
          </div>
          <div className="format">
            <span>&#9654;</span>
            <p>
              <strong>Full lecture</strong>
              <small>Detailed mechanism</small>
            </p>
            <i>&#8594;</i>
          </div>
          <div className="format">
            <span>&#9998;</span>
            <p>
              <strong>Structured answer</strong>
              <small>Write for the examiner</small>
            </p>
            <i>&#8594;</i>
          </div>
          <div className="format">
            <span>&#10003;</span>
            <p>
              <strong>Quiz</strong>
              <small>Check understanding</small>
            </p>
          </div>
        </div>
      </section>

      <section className="lesson-catalogue" id="lessons">
        <div className="catalogue-heading">
          <div>
            <span className="kicker">{course.title} curriculum</span>
            <h2>Course lessons</h2>
          </div>
          <p>Study in sequence for the best understanding, or open the topic you need to revise.</p>
        </div>
        <CourseModules
          modules={modules}
          courseSlug={course.slug}
          hasFullAccess={hasFullAccess}
        />
      </section>

      <footer className="course-footer">
        <p>&copy; {new Date().getFullYear()} MedPhysio Tutorials.</p>
        <small>Built for curious minds.</small>
      </footer>
    </main>
  );
}
