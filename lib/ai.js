// Grounded AI Q&A: the assistant is only given this specific lesson's text as
// context and instructed to answer from it, so it behaves like a study aid for
// that lesson rather than a general-purpose chatbot.
//
// Requires ANTHROPIC_API_KEY in the environment. Get one at https://console.anthropic.com
// Model id is configurable via ANTHROPIC_MODEL (see docs.anthropic.com for current model ids).

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function askAboutLesson({ lessonTitle, courseTitle, lessonHtml, question, history = [] }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      error: true,
      message:
        "AI Q&A isn't configured yet. Set ANTHROPIC_API_KEY in your environment (see .env.example) to enable it.",
    };
  }

  const lessonText = stripHtml(lessonHtml).slice(0, 12000); // keep prompt bounded

  const system = `You are the study assistant embedded in the "${lessonTitle}" lesson of the "${courseTitle}" course on MedPhysio Tutorials.
Answer ONLY using the lesson content provided below. Do not use outside knowledge to add facts that aren't supported by this content.
If the student asks something this lesson doesn't cover, say so plainly and suggest which part of the lesson (or which other topic) they should look at instead — do not answer from general knowledge.
Keep answers concise, exam-focused, and use the same terminology as the lesson. Use short paragraphs or a short list, not long essays.

LESSON CONTENT:
"""
${lessonText}
"""`;

  const messages = [
    ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: question },
  ];

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
        max_tokens: 600,
        system,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic API error", res.status, errText);
      return { error: true, message: "The AI assistant is temporarily unavailable. Please try again shortly." };
    }

    const data = await res.json();
    const text = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return { error: false, message: text || "I couldn't generate a response — please try rephrasing your question." };
  } catch (err) {
    console.error("Anthropic API request failed", err);
    return { error: true, message: "The AI assistant is temporarily unavailable. Please try again shortly." };
  }
}
