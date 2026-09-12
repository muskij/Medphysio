"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AITopicCreator({ courseId, courseSlug }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [voiceLink, setVoiceLink] = useState("");
  const [answerLink, setAnswerLink] = useState("");
  const [miniText, setMiniText] = useState("");
  const [quizCount, setQuizCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/topics/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title,
          description,
          videoLink,
          voiceLink,
          answerLink,
          miniText,
          quizCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      // Send them straight to the new lesson's editor to review what the AI wrote.
      router.push(`/admin/lessons/${data.lessonId}`);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button className="admin-btn secondary" style={{ marginTop: 18 }} onClick={() => setOpen(true)}>
        {"\u2728 Generate a whole topic with AI"}
      </button>
    );
  }

  return (
    <form className="admin-form admin-card" style={{ background: "#f6faf9", marginTop: 18 }} onSubmit={handleSubmit}>
      <strong style={{ fontSize: 14 }}>Generate a new topic with AI</strong>
      <p style={{ fontSize: 12, color: "#7c9195", margin: "4px 0 14px" }}>
        Creates a new topic with one lesson inside it. Give it a title and description, and paste any links you
        have &mdash; the AI will draft the mini-text and video/answer descriptions, and any embed links are
        normalized automatically. You can edit everything afterwards.
      </p>

      <label htmlFor="ai-title">Topic / lesson title</label>
      <input id="ai-title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cardiac Output" />

      <label htmlFor="ai-desc">Description (what should this lesson cover?)</label>
      <textarea
        id="ai-desc"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g. Definition of cardiac output, the Fick principle, factors affecting stroke volume and heart rate, and how CO changes during exercise."
      />

      <label htmlFor="ai-video">Full lecture video link (optional)</label>
      <input id="ai-video" type="url" value={videoLink} onChange={(e) => setVideoLink(e.target.value)} placeholder="https://youtu.be/..." />

      <label htmlFor="ai-voice">Voice note link (optional)</label>
      <input id="ai-voice" type="url" value={voiceLink} onChange={(e) => setVoiceLink(e.target.value)} placeholder="https://drive.google.com/file/d/..." />

      <label htmlFor="ai-answer">Structured-answer video link (optional)</label>
      <input id="ai-answer" type="url" value={answerLink} onChange={(e) => setAnswerLink(e.target.value)} placeholder="https://youtu.be/..." />

      <label htmlFor="ai-minitext">
        Mini-text (optional &mdash; leave blank and the AI will draft this from your description)
      </label>
      <textarea
        id="ai-minitext"
        value={miniText}
        onChange={(e) => setMiniText(e.target.value)}
        placeholder="Leave blank to let AI write this, or paste your own text/HTML here"
      />

      <label htmlFor="ai-quizcount">Starter quiz questions (0 to skip)</label>
      <input
        id="ai-quizcount"
        type="number"
        min={0}
        max={10}
        value={quizCount}
        onChange={(e) => setQuizCount(Number(e.target.value))}
        style={{ width: 80 }}
      />

      {error && <p className="admin-error">{error}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="admin-btn" type="submit" disabled={loading}>
          {loading ? "Generating\u2026 this can take a moment" : "\u2728 Create topic"}
        </button>
        <button className="admin-btn secondary" type="button" onClick={() => setOpen(false)} disabled={loading}>
          Cancel
        </button>
      </div>
    </form>
  );
}
