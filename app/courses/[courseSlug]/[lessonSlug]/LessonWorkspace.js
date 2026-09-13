"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const TAB_META = [
  { id: "mini", icon: "\u25eb", caption: "Start here", label: "Mini-text", duration: "5 min read" },
  { id: "voice", icon: "\u266b", caption: "Listen and revise", label: "Voice note", duration: "Audio lesson" },
  { id: "full", icon: "\u25b6", caption: "Detailed lesson", label: "Full lecture", duration: "Video lesson" },
  { id: "answer", icon: "\u270e", caption: "Exam preparation", label: "Structured answer", duration: "Video lesson" },
  { id: "quiz", icon: "\u2713", caption: "Test yourself", label: "Quick quiz", duration: "" },
];

export default function LessonWorkspace({ course, lesson, moduleIndex, questions, progress, nextLesson }) {
  const router = useRouter();
  const initialTabsDone = useMemo(() => {
    try {
      return new Set(JSON.parse(progress?.tabs_completed || "[]"));
    } catch {
      return new Set();
    }
  }, [progress]);

  const [activeTab, setActiveTab] = useState("mini");
  const [tabsDone, setTabsDone] = useState(initialTabsDone);
  const [showAi, setShowAi] = useState(false);
  const [marking, setMarking] = useState(false);

  const totalTabs = TAB_META.length;
  const doneCount = tabsDone.size;
  const activeMeta = TAB_META.find((t) => t.id === activeTab);

  async function markComplete(tabId) {
    if (tabsDone.has(tabId)) return;
    setMarking(true);
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, tab: tabId }),
      });
      if (res.ok) {
        setTabsDone((prev) => new Set(prev).add(tabId));
      }
    } finally {
      setMarking(false);
    }
  }

  return (
    <main className="lesson-page">
      <header className="lesson-topbar">
        <Link className="logo" href="/">
          <span className="logo-mark">
            M<span>+</span>
          </span>
          <span className="logo-copy">
            <strong>MedPhysio</strong>
            <small>Tutorials</small>
          </span>
        </Link>
        <div className="lesson-breadcrumb">
          <Link href={`/courses/${course.slug}`}>{course.title}</Link>
          <span>&rsaquo;</span>
          <strong>Topic {moduleIndex + 1}</strong>
        </div>
        <button className="student-chip" onClick={() => router.push("/dashboard")}>
          <span>ST</span>
          <p>
            <strong>Student</strong>
            <small>Learning mode</small>
          </p>
        </button>
      </header>

      <div className="lesson-shell">
        <aside className="lesson-sidebar">
          <Link className="sidebar-back" href={`/courses/${course.slug}`}>
            &#8592; Course overview
          </Link>
          <span className="topic-label">Topic {moduleIndex + 1}</span>
          <h1>{lesson.title}</h1>
          <div className="overall-progress">
            <div>
              <span>Lesson progress</span>
              <strong>
                {doneCount}/{totalTabs}
              </strong>
            </div>
            <div className="overall-bar">
              <span style={{ width: `${(doneCount / totalTabs) * 100}%` }}></span>
            </div>
          </div>
          <nav className="lesson-tabs" aria-label="Lesson materials">
            {TAB_META.map((tab) => (
              <button
                key={tab.id}
                className={`${activeTab === tab.id ? "active" : ""} ${tabsDone.has(tab.id) ? "done" : ""}`}
                aria-expanded={activeTab === tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowAi(false);
                }}
              >
                <span>{tabsDone.has(tab.id) ? "\u2713" : tab.icon}</span>
                <p>
                  <strong>{tab.label}</strong>
                  <small>{tab.duration}</small>
                </p>
              </button>
            ))}
            <button
              className={showAi ? "active" : ""}
              onClick={() => setShowAi(true)}
              style={{ marginTop: 4, borderTop: "1px dashed var(--line)", paddingTop: 14 }}
            >
              <span>&#10022;</span>
              <p>
                <strong>Ask AI</strong>
                <small>Grounded in this lesson</small>
              </p>
            </button>
          </nav>
        </aside>

        <section className="lesson-workspace">
          {!showAi && (
            <div className="workspace-heading">
              <div>
                <span className="workspace-kicker">{activeMeta.caption}</span>
                <h2>{activeMeta.label}</h2>
              </div>
              {activeMeta.duration && <span className="duration-pill">&#9711; {activeMeta.duration}</span>}
            </div>
          )}

          {showAi && (
            <AiPanel course={course} lesson={lesson} onClose={() => setShowAi(false)} />
          )}

          {!showAi && activeTab === "mini" && (
            <MiniTextPanel html={lesson.mini_text_html} />
          )}

          {!showAi && activeTab === "voice" && <VoicePanel lesson={lesson} />}

          {!showAi && activeTab === "full" && (
            <VideoPanel
              embedUrl={lesson.video_embed_url}
              title={lesson.video_title || lesson.title}
              desc={lesson.video_desc}
              linkUrl={lesson.video_link_url}
              kicker="MedPhysio full lecture"
            />
          )}

          {!showAi && activeTab === "answer" && (
            <VideoPanel
              embedUrl={lesson.answer_embed_url}
              title={lesson.answer_title || `How to write a structured answer on ${lesson.title}`}
              desc={lesson.answer_desc}
              linkUrl={lesson.answer_link_url}
              kicker="MedPhysio structured answer"
              structured
            />
          )}

          {!showAi && activeTab === "quiz" && (
            <QuizPanel
              lessonId={lesson.id}
              questions={questions}
              onDone={() => markComplete("quiz")}
            />
          )}

          {!showAi && (
            <div className="workspace-footer">
              {activeTab !== "quiz" && (
                <button
                  className={`complete-button ${tabsDone.has(activeTab) ? "completed" : ""}`}
                  disabled={marking || tabsDone.has(activeTab)}
                  onClick={() => markComplete(activeTab)}
                >
                  {tabsDone.has(activeTab) ? "Section complete" : "Mark this section complete"}
                </button>
              )}
              <p>
                {doneCount === totalTabs ? "Lesson complete \u2014 nice work!" : "Your progress is saved to your account."}
                {doneCount === totalTabs && nextLesson && (
                  <Link href={`/courses/${course.slug}/${nextLesson.slug}`} style={{ color: "var(--teal)", fontWeight: 700 }}>
                    {" "}
                    Continue to &ldquo;{nextLesson.title}&rdquo; &#8594;
                  </Link>
                )}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MiniTextPanel({ html }) {
  if (!html) {
    return (
      <article className="mini-text-card">
        <p>This lesson&rsquo;s mini-text hasn&rsquo;t been added yet. Check back soon, or add it from the admin panel.</p>
      </article>
    );
  }
  return <article className="mini-text-card" dangerouslySetInnerHTML={{ __html: html }} />;
}

function VoicePanel({ lesson }) {
  if (!lesson.voice_embed_url) {
    return (
      <div className="media-stage voice">
        <span className="media-icon">&#9835;</span>
        <h3>Voice note coming soon</h3>
        <p>This lesson doesn&rsquo;t have an audio revision note yet.</p>
      </div>
    );
  }
  return (
    <div className="audio-lesson-card">
      <div className="audio-lesson-heading">
        <span className="audio-lesson-icon">&#9835;</span>
        <div>
          <span>MedPhysio voice note</span>
          <h3>{lesson.title}</h3>
        </div>
      </div>
      <iframe className="drive-audio-player" src={lesson.voice_embed_url} title={`${lesson.title} voice note`} allow="autoplay" />
      <p>Use this focused audio revision to reinforce the lesson&rsquo;s key points.</p>
      {lesson.voice_link_url && (
        <a href={lesson.voice_link_url} target="_blank" rel="noreferrer">
          Open voice note in a new tab &#8599;
        </a>
      )}
    </div>
  );
}

function VideoPanel({ embedUrl, title, desc, linkUrl, kicker, structured }) {
  if (!embedUrl) {
    return (
      <div className={`media-stage ${structured ? "answer" : "full"}`}>
        <span className="media-icon">&#9654;</span>
        <h3>Video coming soon</h3>
        <p>This lesson doesn&rsquo;t have this video yet.</p>
      </div>
    );
  }
  return (
    <div className={`video-lesson-card ${structured ? "structured-video-card" : ""}`}>
      <div className="video-player-frame">
        <iframe src={embedUrl} title={title} allowFullScreen />
      </div>
      <div className="video-lesson-details">
        <span>{kicker}</span>
        <h3>{title}</h3>
        {desc && <p>{desc}</p>}
        {linkUrl && (
          <a href={linkUrl} target="_blank" rel="noreferrer">
            Open on YouTube &#8599;
          </a>
        )}
      </div>
    </div>
  );
}

function QuizPanel({ lessonId, questions, onDone }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // questionId -> optionId
  const [results, setResults] = useState(null); // { score, total, feedback: {questionId: {correct, correctOptionId, explanation}} }
  const [submitting, setSubmitting] = useState(false);

  if (!questions.length) {
    return (
      <div className="quiz-workspace">
        <h3>No quiz questions yet</h3>
        <p style={{ color: "#6d8185", fontSize: 12 }}>Add some questions to this lesson from the admin panel.</p>
      </div>
    );
  }

  const current = questions[index];
  const selected = answers[current.id];
  const feedback = results?.feedback?.[current.id];

  function selectOption(optionId) {
    if (results) return; // locked after submit
    setAnswers((prev) => ({ ...prev, [current.id]: optionId }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const payload = {
        lessonId,
        answers: questions.map((q) => ({ questionId: q.id, optionId: answers[q.id] || null })),
      };
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data);
        onDone();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const allAnswered = questions.every((q) => answers[q.id]);

  return (
    <div className="quiz-workspace">
      <span className="question-count">
        Question {index + 1} of {questions.length}
      </span>
      <h3>{current.question}</h3>
      <div className="answer-options">
        {current.options.map((opt) => {
          let cls = "";
          if (feedback) {
            if (opt.id === feedback.correctOptionId) cls = "correct";
            else if (opt.id === selected) cls = "incorrect";
          } else if (opt.id === selected) {
            cls = "correct";
          }
          return (
            <button key={opt.id} className={cls} onClick={() => selectOption(opt.id)} disabled={!!results}>
              <span>{opt.label}</span>
              {opt.text}
            </button>
          );
        })}
      </div>
      {feedback && (
        <div className={`answer-feedback ${feedback.correct ? "right" : "wrong"}`}>
          <strong>{feedback.correct ? "Correct!" : "Not quite."}</strong>
          {feedback.explanation && <p>{feedback.explanation}</p>}
        </div>
      )}

      <div style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center" }}>
        {index > 0 && (
          <button className="complete-button" style={{ background: "#e8efed", color: "#526a6f" }} onClick={() => setIndex((i) => i - 1)}>
            Back
          </button>
        )}
        {index < questions.length - 1 && (
          <button className="complete-button" onClick={() => setIndex((i) => i + 1)}>
            Next question
          </button>
        )}
        {index === questions.length - 1 && !results && (
          <button className="complete-button" disabled={!allAnswered || submitting} onClick={handleSubmit}>
            {submitting ? "Grading\u2026" : "Submit quiz"}
          </button>
        )}
        {results && (
          <span style={{ fontSize: 12, color: "var(--teal)", fontWeight: 800 }}>
            Score: {results.score}/{results.total}
          </span>
        )}
      </div>
    </div>
  );
}

function AiPanel({ course, lesson, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const question = input.trim();
    setInput("");
    setError("");
    const priorMessages = messages;
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setSending(true);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, question, history: priorMessages }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.message || "The AI assistant is unavailable right now.");
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
    } catch {
      setError("Something went wrong reaching the AI assistant.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mini-text-card" style={{ display: "flex", flexDirection: "column", minHeight: 480 }}>
      <div className="mini-text-header">
        <span>Ask about &ldquo;{lesson.title}&rdquo;</span>
        <strong>Grounded in this lesson only</strong>
      </div>
      <p style={{ color: "#587176", fontSize: 12 }}>
        This assistant only uses this lesson&rsquo;s own content to answer &mdash; it won&rsquo;t make things up from
        outside material. Try: &ldquo;Summarise the key causes&rdquo; or &ldquo;Why does that happen?&rdquo;
      </p>
      <div style={{ flex: 1, overflowY: "auto", margin: "16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 && <p style={{ color: "#9aabad", fontSize: 12 }}>Ask your first question below.</p>}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "80%",
              padding: "10px 14px",
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              background: m.role === "user" ? "var(--teal)" : "#f4faf8",
              color: m.role === "user" ? "white" : "#40595e",
            }}
          >
            {m.content}
          </div>
        ))}
        {sending && <div style={{ color: "#9aabad", fontSize: 12 }}>Thinking&hellip;</div>}
      </div>
      {error && <p style={{ color: "#c0392b", fontSize: 12 }}>{error}</p>}
      <form onSubmit={sendMessage} style={{ display: "flex", gap: 10 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this lesson\u2026"
          style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13 }}
        />
        <button className="complete-button" type="submit" disabled={sending || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
