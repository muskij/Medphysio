import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "../../../../lib/auth";
import { getCourseById, getModulesForCourse, listLecturers } from "../../../../lib/queries";
import CourseSettingsForm from "./CourseSettingsForm";
import ModuleManager from "./ModuleManager";

export default async function AdminCourseDetailPage({ params }) {
  const user = await getSessionUser();
  const course = getCourseById(params.id);
  if (!course) return notFound();
  if (user.role === "LECTURER" && course.lecturer_id !== user.id) return notFound();

  const modules = getModulesForCourse(course.id);
  const lecturers = user.role === "ADMIN" ? listLecturers() : [];

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>{course.title}</h1>
          <p>
            <Link href="/admin/courses">&#8592; All courses</Link>
          </p>
        </div>
        <Link className="admin-btn secondary" href={`/courses/${course.slug}`} target="_blank">
          View public page &#8599;
        </Link>
      </div>

      <div className="admin-card" style={{ maxWidth: 560 }}>
        <h3 style={{ marginTop: 0 }}>Course settings</h3>
        <CourseSettingsForm course={course} lecturers={lecturers} isAdmin={user.role === "ADMIN"} />
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Modules &amp; lessons</h3>
        <ModuleManager courseId={course.id} courseSlug={course.slug} initialModules={modules} />
      </div>
    </>
  );
}
