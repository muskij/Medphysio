import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "../../../../lib/auth";
import { getLessonById, getCourseById, getQuizQuestions } from "../../../../lib/queries";
import LessonEditor from "./LessonEditor";
import QuizBuilder from "./QuizBuilder";

export default async function AdminLessonPage({ params }) {
  const user = await getSessionUser();
  const lesson = getLessonById(params.id);
  if (!lesson) return notFound();
  const course = getCourseById(lesson.course_id);
  if (!course || (user.role === "LECTURER" && course.lecturer_id !== user.id)) return notFound();

  const questions = getQuizQuestions(lesson.id);

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>{lesson.title}</h1>
          <p>
            <Link href={`/admin/courses/${course.id}`}>&#8592; {course.title}</Link>
          </p>
        </div>
        <Link className="admin-btn secondary" href={`/courses/${course.slug}/${lesson.slug}`} target="_blank">
          View live &#8599;
        </Link>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Lesson content</h3>
        <LessonEditor lesson={lesson} />
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Quiz questions</h3>
        <QuizBuilder lessonId={lesson.id} initialQuestions={questions} />
      </div>
    </>
  );
}
