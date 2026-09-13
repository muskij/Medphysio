import { redirect } from "next/navigation";
import { getSessionUser } from "../../../lib/auth";
import { listLecturers } from "../../../lib/queries";
import NewLecturerForm from "./NewLecturerForm";

export default async function AdminLecturersPage() {
  const user = await getSessionUser();
  if (user.role !== "ADMIN") redirect("/admin");

  const lecturers = listLecturers();

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>Lecturers</h1>
          <p>Give other lecturers their own login to manage their own courses.</p>
        </div>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>All lecturers</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {lecturers.map((l) => (
              <tr key={l.id}>
                <td>{l.name}</td>
                <td>{l.email}</td>
                <td>{new Date(l.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {lecturers.length === 0 && (
              <tr>
                <td colSpan={3} style={{ color: "#8fa2a5" }}>
                  No lecturers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-card" style={{ maxWidth: 480 }}>
        <h3 style={{ marginTop: 0 }}>Add a lecturer</h3>
        <NewLecturerForm />
      </div>
    </>
  );
}
