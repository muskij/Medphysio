"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <label>{label}</label>
      {hint && <p style={{ fontSize: 12, color: "#8fa2a5", margin: "0 0 6px" }}>{hint}</p>}
      {children}
    </div>
  );
}

export default function LessonEditor({ lesson }) {
  const router = useRouter();
  const [title, setTitle] = useState(lesson.title);
  const [freePreview, setFreePreview] = useState(!!lesson.free_preview);
  const [miniTextHtml, setMiniTextHtml] = useState(lesson.mini_text_html || "");
  const [voiceEmbedUrl, setVoiceEmbedUrl] = useState(lesson.voice_embed_url || "");
  const [voiceLinkUrl, setVoiceLinkUrl] = useState(lesson.voice_link_url || "");
  const [videoEmbedUrl, setVideoEmbedUrl] = useState(lesson.video_embed_url || "");
  const [videoLinkUrl, setVideoLinkUrl] = useState(lesson.video_link_url || "");
  const [videoTitle, setVideoTitle] = useState(lesson.video_title || "");
  const [videoDesc, setVideoDesc] = useState(lesson.video_desc || "");
  const [answerEmbedUrl, setAnswerEmbedUrl] = useState(lesson.answer_embed_url || "");
  const [answerLinkUrl, setAnswerLinkUrl] = useState(lesson.answer_link_url || "");
  const [answerTitle, setAnswerTitle] = useState(lesson.answer_title || "");
  const [answerDesc, setAnswerDesc] = useState(lesson.answer_desc || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          free_preview: freePreview,
          mini_text_html: miniTextHtml,
          voice_embed_url: voiceEmbedUrl,
          voice_link_url: voiceLinkUrl,
          video_embed_url: videoEmbedUrl,
          video_link_url: videoLinkUrl,
          video_title: videoTitle,
          video_desc: videoDesc,
          answer_embed_url: answerEmbedUrl,
          answer_link_url: answerLinkUrl,
          answer_title: answerTitle,
          answer_desc: answerDesc,
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

  return (
    <form className="admin-form" onSubmit={handleSave}>
      <Field label="Lesson title">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>

      <div className="checkbox-row">
        <input id="fp" type="checkbox" checked={freePreview} onChange={(e) => setFreePreview(e.target.checked)} />
        <label htmlFor="fp" style={{ margin: 0 }}>
          Free preview (visible without enrolling or paying)
        </label>
      </div>

      <hr style={{ margin: "22px 0", border: "none", borderTop: "1px solid var(--line)" }} />
      <h4 style={{ margin: "0 0 6px" }}>Mini-text</h4>
      <Field label="Content" hint="HTML is supported (e.g. <p>, <h3>, <ul>). This is also what grounds the AI assistant for this lesson.">
        <textarea
          style={{ minHeight: 220, fontFamily: "monospace", fontSize: 13 }}
          value={miniTextHtml}
          onChange={(e) => setMiniTextHtml(e.target.value)}
          placeholder="<p>Anaemia is defined as...</p>"
        />
      </Field>

      <hr style={{ margin: "22px 0", border: "none", borderTop: "1px solid var(--line)" }} />
      <h4 style={{ margin: "0 0 6px" }}>Voice note</h4>
      <Field label="Embeddable audio URL" hint="e.g. a Google Drive preview link or direct audio embed URL.">
        <input type="url" value={voiceEmbedUrl} onChange={(e) => setVoiceEmbedUrl(e.target.value)} />
      </Field>
      <Field label="Shareable link (optional, opens in a new tab)">
        <input type="url" value={voiceLinkUrl} onChange={(e) => setVoiceLinkUrl(e.target.value)} />
      </Field>

      <hr style={{ margin: "22px 0", border: "none", borderTop: "1px solid var(--line)" }} />
      <h4 style={{ margin: "0 0 6px" }}>Full lecture</h4>
      <Field label="Video embed URL" hint="e.g. https://www.youtube.com/embed/VIDEO_ID">
        <input type="url" value={videoEmbedUrl} onChange={(e) => setVideoEmbedUrl(e.target.value)} />
      </Field>
      <Field label="Video title (optional, defaults to lesson title)">
        <input type="text" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} />
      </Field>
      <Field label="Video description">
        <textarea value={videoDesc} onChange={(e) => setVideoDesc(e.target.value)} />
      </Field>
      <Field label="YouTube link (optional)">
        <input type="url" value={videoLinkUrl} onChange={(e) => setVideoLinkUrl(e.target.value)} />
      </Field>

      <hr style={{ margin: "22px 0", border: "none", borderTop: "1px solid var(--line)" }} />
      <h4 style={{ margin: "0 0 6px" }}>Structured answer video</h4>
      <Field label="Video embed URL">
        <input type="url" value={answerEmbedUrl} onChange={(e) => setAnswerEmbedUrl(e.target.value)} />
      </Field>
      <Field label="Title (optional)">
        <input type="text" value={answerTitle} onChange={(e) => setAnswerTitle(e.target.value)} />
      </Field>
      <Field label="Description">
        <textarea value={answerDesc} onChange={(e) => setAnswerDesc(e.target.value)} />
      </Field>
      <Field label="YouTube link (optional)">
        <input type="url" value={answerLinkUrl} onChange={(e) => setAnswerLinkUrl(e.target.value)} />
      </Field>

      {error && <p className="admin-error">{error}</p>}
      {message && <p className="admin-success">{message}</p>}
      <button className="admin-btn" type="submit" disabled={saving} style={{ marginTop: 18 }}>
        {saving ? "Saving\u2026" : "Save lesson content"}
      </button>
    </form>
  );
}
