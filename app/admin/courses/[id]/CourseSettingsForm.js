"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CourseSettingsForm({ course, lecturers, isAdmin }) {
  const router = useRouter();
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description || "");
  const [requiresSubscription, setRequiresSubscription] = useState(!!course.requires_subscription);
  const [published, setPublished] = useState(!!course.published);
  const [lecturerId, setLecturerId] = useState(course.lecturer_id || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          requiresSubscription,
          published,
          ...(isAdmin ? { lecturerId: lecturerId || null } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setMessage("Saved.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this course and all its modules, lessons and progress data? This can't be undone.")) return;
    const res = await fetch(`/api/courses/${course.id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/courses");
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <label htmlFor="title">Title</label>
      <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />

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
          <label htmlFor="lecturer">Lecturer</label>
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

      <div className="checkbox-row">
        <input id="published" type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        <label htmlFor="published" style={{ margin: 0 }}>
          Published (visible on the public site)
        </label>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {message && <p className="admin-success">{message}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="admin-btn" type="submit" disabled={saving}>
          {saving ? "Saving\u2026" : "Save changes"}
        </button>
        <button className="admin-btn danger" type="button" onClick={handleDelete}>
          Delete course
        </button>
      </div>
    </form>
  );
}
