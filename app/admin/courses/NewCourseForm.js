"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCourseForm({ lecturers, isAdmin }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiresSubscription, setRequiresSubscription] = useState(true);
  const [lecturerId, setLecturerId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, requiresSubscription, lecturerId: lecturerId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      router.push(`/admin/courses/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <label htmlFor="title">Course title</label>
      <input id="title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} />

      <label htmlFor="description">Description</label>
      <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />

      <div className="checkbox-row">
        <input
          id="requiresSubscription"
          type="checkbox"
          checked={requiresSubscription}
          onChange={(e) => setRequiresSubscription(e.target.checked)}
        />
        <label htmlFor="requiresSubscription" style={{ margin: 0 }}>
          Requires an active subscription (uncheck to make it free for everyone)
        </label>
      </div>

      {isAdmin && (
        <>
          <label htmlFor="lecturer">Assign to lecturer (optional)</label>
          <select id="lecturer" value={lecturerId} onChange={(e) => setLecturerId(e.target.value)}>
            <option value="">Unassigned</option>
            {lecturers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </>
      )}

      {error && <p className="admin-error">{error}</p>}
      <button className="admin-btn" type="submit" disabled={loading} style={{ marginTop: 16 }}>
        {loading ? "Creating\u2026" : "Create course"}
      </button>
    </form>
  );
}
