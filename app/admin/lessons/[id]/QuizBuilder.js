"use client";

import { useState } from "react";

function emptyOptions() {
  return [
    { label: "A", text: "", isCorrect: true },
    { label: "B", text: "", isCorrect: false },
    { label: "C", text: "", isCorrect: false },
    { label: "D", text: "", isCorrect: false },
  ];
}

export default function QuizBuilder({ lessonId, initialQuestions }) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [adding, setAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newExplanation, setNewExplanation] = useState("");
  const [newOptions, setNewOptions] = useState(emptyOptions());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateNewOption(i, field, value) {
    setNewOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)));
  }
  function markNewCorrect(i) {
    setNewOptions((prev) => prev.map((o, idx) => ({ ...o, isCorrect: idx === i })));
  }

  async function handleAddQuestion(e) {
    e.preventDefault();
    setError("");
    if (!newQuestion.trim() || newOptions.some((o) => !o.text.trim())) {
      setError("Fill in the question and all four options.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, question: newQuestion, explanation: newExplanation, options: newOptions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setQuestions((prev) => [
        ...prev,
        { id: data.id, question: newQuestion, explanation: newExplanation, options: newOptions.map((o, i) => ({ ...o, id: `${data.id}-${i}`, is_correct: o.isCorrect ? 1 : 0 })) },
      ]);
      setNewQuestion("");
      setNewExplanation("");
      setNewOptions(emptyOptions());
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this question?")) return;
    const res = await fetch(`/api/quiz/${id}`, { method: "DELETE" });
    if (res.ok) setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  return (
    <div>
      {questions.map((q, qi) => (
        <div key={q.id} style={{ borderBottom: "1px solid var(--line)", padding: "14px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>
              Q{qi + 1}. {q.question}
            </strong>
            <button className="admin-btn danger" style={{ padding: "3px 10px" }} onClick={() => handleDelete(q.id)}>
              Delete
            </button>
          </div>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, color: "#526a6f" }}>
            {q.options.map((o) => (
              <li key={o.id} style={{ fontWeight: o.is_correct ? 700 : 400, color: o.is_correct ? "var(--teal)" : "#526a6f" }}>
                {o.label}. {o.text} {o.is_correct ? "(correct)" : ""}
              </li>
            ))}
          </ul>
          {q.explanation && <p style={{ fontSize: 12, color: "#8fa2a5", marginTop: 6 }}>Explanation: {q.explanation}</p>}
        </div>
      ))}
      {questions.length === 0 && <p style={{ color: "#8fa2a5" }}>No questions yet.</p>}

      {!adding ? (
        <button className="admin-btn" style={{ marginTop: 16 }} onClick={() => setAdding(true)}>
          + Add question
        </button>
      ) : (
        <form className="admin-form" onSubmit={handleAddQuestion} style={{ marginTop: 16 }}>
          <label>Question</label>
          <textarea value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="What is the main cause of...?" />

          <label style={{ marginTop: 16 }}>Options (select the correct one)</label>
          {newOptions.map((opt, i) => (
            <div className="quiz-option-row" key={i}>
              <input type="radio" name="correct" checked={opt.isCorrect} onChange={() => markNewCorrect(i)} />
              <span style={{ fontWeight: 700, width: 16 }}>{opt.label}</span>
              <input type="text" value={opt.text} onChange={(e) => updateNewOption(i, "text", e.target.value)} placeholder={`Option ${opt.label}`} />
            </div>
          ))}

          <label>Explanation (shown after the student answers)</label>
          <textarea value={newExplanation} onChange={(e) => setNewExplanation(e.target.value)} />

          {error && <p className="admin-error">{error}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button className="admin-btn" type="submit" disabled={saving}>
              {saving ? "Saving\u2026" : "Save question"}
            </button>
            <button className="admin-btn secondary" type="button" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
