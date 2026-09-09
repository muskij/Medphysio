import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "../../../../../../lib/auth";
import { db } from "../../../../../../lib/db";
import { getCourseById, getLessonsForModule } from "../../../../../../lib/queries";
import LessonManager from "./LessonManager";

export default async function AdminModulePage({ params }) {
  const user = await getSessionUser();
  const mod = db.prepare("SELECT * FROM modules WHERE id = ?").get(params.moduleId);
  if (!mod) return notFound();
  const course = getCourseById(mod.course_id);
  if (!course || (user.role === "LECTURER" && course.lecturer_id !== user.id)) return notFound();

  const lessons = getLessonsForModule(mod.id);

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>{mod.title}</h1>
          <p>
            <Link href={`/admin/courses/${course.id}`}>&#8592; {course.title}</Link>
          </p>
        </div>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Lessons</h3>
        <LessonManager moduleId={mod.id} initialLessons={lessons} />
      </div>
    </>
  );
}
