"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ModuleManager({ courseId, courseSlug, initialModules }) {
  const router = useRouter();
  const [modules, setModules] = useState(initialModules);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, title }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setModules((prev) => [...prev, { id: data.id, course_id: courseId, title, position: prev.length }]);
      setTitle("");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this topic and all its lessons?")) return;
    const res = await fetch(`/api/modules/${id}`, { method: "DELETE" });
    if (res.ok) setModules((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Topic</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {modules.map((m, i) => (
            <tr key={m.id}>
              <td>{i + 1}</td>
              <td>{m.title}</td>
              <td style={{ display: "flex", gap: 14 }}>
                <Link href={`/admin/courses/${courseId}/modules/${m.id}`}>Manage lessons &#8594;</Link>
                <button className="admin-btn danger" style={{ padding: "4px 10px" }} onClick={() => handleDelete(m.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {modules.length === 0 && (
            <tr>
              <td colSpan={3} style={{ color: "#8fa2a5" }}>
                No topics yet &mdash; add your first one below.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <form onSubmit={handleAdd} style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <input
          type="text"
          placeholder="New topic title, e.g. Cardiovascular Physiology"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)" }}
        />
        <button className="admin-btn" disabled={loading} type="submit">
          {loading ? "Adding\u2026" : "Add topic"}
        </button>
      </form>
      {error && <p className="admin-error">{error}</p>}
    </div>
  );
}
