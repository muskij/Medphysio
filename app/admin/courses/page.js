import Link from "next/link";
import { getSessionUser } from "../../../lib/auth";
import { listCourses, listLecturers } from "../../../lib/queries";
import NewCourseForm from "./NewCourseForm";

export default async function AdminCoursesPage() {
  const user = await getSessionUser();
  const allCourses = listCourses();
  const courses = user.role === "ADMIN" ? allCourses : allCourses.filter((c) => c.lecturer_id === user.id);
  const lecturers = user.role === "ADMIN" ? listLecturers() : [];

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>Courses</h1>
          <p>Create and manage your course catalogue.</p>
        </div>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>All courses</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Lecturer</th>
              <th>Access</th>
              <th>Lessons</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td>{c.lecturer_name || "\u2014"}</td>
                <td>{c.requires_subscription ? "Subscription" : "Free"}</td>
                <td>{c.lesson_count}</td>
                <td>
                  <Link href={`/admin/courses/${c.id}`}>Manage &#8594;</Link>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "#8fa2a5" }}>
                  No courses yet &mdash; create one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-card" style={{ maxWidth: 480 }}>
        <h3 style={{ marginTop: 0 }}>New course</h3>
        <NewCourseForm lecturers={lecturers} isAdmin={user.role === "ADMIN"} />
      </div>
    </>
  );
}
