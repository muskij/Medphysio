import Link from "next/link";
import { getSessionUser } from "../../lib/auth";
import { db } from "../../lib/db";
import LogoutButton from "../../components/LogoutButton";

export default async function AdminLayout({ children }) {
  const user = await getSessionUser();
  const pendingTransfers =
    user?.role === "ADMIN" ? db.prepare("SELECT COUNT(*) AS n FROM transfer_requests WHERE status = 'PENDING'").get().n : 0;

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
        {user?.role === "ADMIN" && (
          <Link href="/admin/transfer-requests">
            Payment requests{pendingTransfers > 0 ? ` (${pendingTransfers})` : ""}
          </Link>
        )}
        {user?.role === "ADMIN" && <Link href="/admin/payment-settings">Payment settings</Link>}
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
