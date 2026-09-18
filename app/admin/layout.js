import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "../../lib/auth";
import LogoutButton from "../../components/LogoutButton";

export default async function AdminLayout({ children }) {
  const user = await getSessionUser();

  // getSessionUser() legitimately returns null for an unauthenticated
  // visitor, or for a session cookie that outlived its account (e.g. a
  // Railway redeploy wiped the SQLite database — see the comment in
  // lib/auth.js). Every page under /admin/* (dashboard, courses,
  // lecturers, payments, analytics, lesson editor) assumes `user` is a
  // real object and reads `user.role`/`user.id` unguarded, which crashed
  // with "Cannot read properties of null (reading 'role')" instead of
  // redirecting to login. Guarding once here, in the shared layout, fixes
  // every admin route at once rather than patching each page individually.
  if (!user) redirect("/login");

  return (
    <div className="admin-shell">
      <link rel="stylesheet" href="/assets/css/admin.css" />
      <aside className="admin-sidebar">
        <Link className="admin-logo" href="/admin">
          MedPhysio Admin
        </Link>
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/courses">Courses</Link>
        {user?.role === "ADMIN" && <Link href="/admin/lecturers">Lecturers</Link>}
        {user?.role === "ADMIN" && <Link href="/admin/payments">Payments</Link>}
        <Link href="/admin/analytics">Analytics</Link>
        <Link href="/">&#8592; View site</Link>
        <div className="admin-role">
          <div style={{ marginBottom: 8 }}>
            {user?.name} &middot; {user?.role}
          </div>
          <LogoutButton className="admin-btn secondary" />
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
