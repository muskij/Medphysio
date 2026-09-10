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

function extractJsonArray(text) {
  // Models sometimes wrap JSON in prose or ```json fences despite instructions.
  // Try a straight parse first, then fall back to slicing out the [ ... ] span.
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1 || end < start) throw new Error("No JSON array found in AI response.");
    return JSON.parse(text.slice(start, end + 1));
  }
}

// Generates multiple-choice quiz questions grounded strictly in the lesson's
// own mini-text content, in a structured JSON shape the admin quiz builder
// can insert directly.
export async function generateQuizQuestions({ lessonTitle, courseTitle, lessonHtml, count = 5 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      error: true,
      message: "AI quiz generation isn't configured yet. Set ANTHROPIC_API_KEY in your environment to enable it.",
    };
  }

  const lessonText = stripHtml(lessonHtml).slice(0, 12000);
  if (lessonText.length < 40) {
    return {
      error: true,
      message: "Add some mini-text content to this lesson first \u2014 the AI needs material to write questions from.",
    };
  }

  const n = Math.min(Math.max(Number(count) || 5, 1), 10);

  const system = `You write multiple-choice exam questions for a Physiology tutoring site, based STRICTLY on the lesson content given below. Every question, option and explanation must be answerable from this content alone \u2014 do not introduce outside facts.

Respond with ONLY a JSON array (no prose, no markdown code fences, no commentary) of exactly ${n} objects, each shaped exactly like this:
{"question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0, "explanation": "..."}

Rules:
- Exactly 4 options per question, plausible and mutually exclusive.
- "correctIndex" is the 0-based index of the correct option.
- Vary which index is correct across questions \u2014 don't always put the answer in the same position.
- "explanation" is 1-2 sentences, referencing the lesson content, shown to the student after they answer.
- Cover distinct points from the lesson rather than repeating the same fact.

LESSON: "${lessonTitle}" (course: "${courseTitle}")
CONTENT:
"""
${lessonText}
"""`;

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
        max_tokens: Math.min(400 * n + 300, 4000),
        system,
        messages: [{ role: "user", content: `Write the ${n} questions now, as the JSON array only.` }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic API error (quiz generation)", res.status, errText);
      return { error: true, message: "The AI quiz generator is temporarily unavailable. Please try again shortly." };
    }

    const data = await res.json();
    const text = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    let parsed;
    try {
      parsed = extractJsonArray(text);
    } catch (err) {
      console.error("Failed to parse AI quiz JSON:", err.message, "\nRaw text:", text);
      return { error: true, message: "The AI returned an unexpected format. Please try again." };
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { error: true, message: "The AI didn't return any valid questions. Please try again." };
    }

    const questions = [];
    for (const item of parsed) {
      if (
        !item ||
        typeof item.question !== "string" ||
        !Array.isArray(item.options) ||
        item.options.length !== 4 ||
        item.options.some((o) => typeof o !== "string" || !o.trim()) ||
        !Number.isInteger(item.correctIndex) ||
        item.correctIndex < 0 ||
        item.correctIndex > 3
      ) {
        continue; // skip malformed entries rather than failing the whole batch
      }
      questions.push({
        question: item.question.trim(),
        explanation: typeof item.explanation === "string" ? item.explanation.trim() : "",
        options: item.options.map((optText, i) => ({
          label: String.fromCharCode(65 + i),
          text: optText.trim(),
          isCorrect: i === item.correctIndex,
        })),
      });
    }

    if (!questions.length) {
      return { error: true, message: "The AI's response didn't match the expected question format. Please try again." };
    }

    return { error: false, questions };
  } catch (err) {
    console.error("Anthropic API request failed (quiz generation)", err);
    return { error: true, message: "The AI quiz generator is temporarily unavailable. Please try again shortly." };
  }
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
