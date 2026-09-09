import Link from "next/link";
import { getSessionUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { listCourses, listStudentsCount } from "../../lib/queries";

export default async function AdminDashboard() {
  const user = await getSessionUser();
  const allCourses = listCourses();
  const courses = user.role === "ADMIN" ? allCourses : allCourses.filter((c) => c.lecturer_id === user.id);

  const totalStudents = listStudentsCount();
  const totalEnrollments = db.prepare("SELECT COUNT(*) AS n FROM enrollments WHERE status = 'ACTIVE'").get().n;
  const totalLessons = courses.reduce((a, c) => a + c.lesson_count, 0);

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>Welcome back, {user.name.split(" ")[0]}</h1>
          <p>Here&rsquo;s what&rsquo;s happening across {user.role === "ADMIN" ? "the platform" : "your courses"}.</p>
        </div>
        <Link className="admin-btn" href="/admin/courses">
          Manage courses
        </Link>
      </div>

      <div className="admin-stats">
        <div className="admin-stat">
          <strong>{courses.length}</strong>
          <span>{user.role === "ADMIN" ? "Total courses" : "Your courses"}</span>
        </div>
        <div className="admin-stat">
          <strong>{totalLessons}</strong>
          <span>Lessons published</span>
        </div>
        {user.role === "ADMIN" && (
          <div className="admin-stat">
            <strong>{totalStudents}</strong>
            <span>Registered students</span>
          </div>
        )}
        <div className="admin-stat">
          <strong>{totalEnrollments}</strong>
          <span>Active enrollments</span>
        </div>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Your courses</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Lessons</th>
              <th>Enrolled</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td>{c.lesson_count}</td>
                <td>{c.enrolled_count}</td>
                <td>
                  <span className="admin-pill">{c.published ? "Published" : "Draft"}</span>
                </td>
                <td>
                  <Link href={`/admin/courses/${c.id}`}>Manage &#8594;</Link>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "#8fa2a5" }}>
                  No courses yet. <Link href="/admin/courses">Create your first one &#8594;</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
