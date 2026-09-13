"use client";

import { useState } from "react";
import Link from "next/link";

export default function LessonManager({ moduleId, initialLessons }) {
  const [lessons, setLessons] = useState(initialLessons);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, title }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setLessons((prev) => [...prev, { id: data.id, slug: data.slug, title, position: prev.length, free_preview: 0 }]);
      setTitle("");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this lesson and its quiz questions?")) return;
    const res = await fetch(`/api/lessons/${id}`, { method: "DELETE" });
    if (res.ok) setLessons((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Lesson</th>
            <th>Free preview</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lessons.map((l, i) => (
            <tr key={l.id}>
              <td>{i + 1}</td>
              <td>{l.title}</td>
              <td>{l.free_preview ? "Yes" : "No"}</td>
              <td style={{ display: "flex", gap: 14 }}>
                <Link href={`/admin/lessons/${l.id}`}>Edit content &amp; quiz &#8594;</Link>
                <button className="admin-btn danger" style={{ padding: "4px 10px" }} onClick={() => handleDelete(l.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {lessons.length === 0 && (
            <tr>
              <td colSpan={4} style={{ color: "#8fa2a5" }}>
                No lessons yet &mdash; add your first one below.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <form onSubmit={handleAdd} style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <input
          type="text"
          placeholder="New lesson title, e.g. Anaemia"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)" }}
        />
        <button className="admin-btn" disabled={loading} type="submit">
          {loading ? "Adding\u2026" : "Add lesson"}
        </button>
      </form>
      {error && <p className="admin-error">{error}</p>}
    </div>
  );
}
