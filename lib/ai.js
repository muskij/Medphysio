// All AI features (quiz generation, lesson-content generation, and the
// grounded lesson Q&A assistant) run on OpenAI's Chat Completions API.
//
// Requires OPENAI_API_KEY in the environment. Get one at https://platform.openai.com/api-keys
// Model id is configurable via OPENAI_MODEL (defaults to gpt-4o-mini).

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Shared OpenAI Chat Completions caller used by every AI feature in this file.
// Returns { ok, text } on success, or { ok: false, message } on any failure -
// callers never need to touch fetch/response-shape details directly.
async function callOpenAI({ system, messages, maxTokens = 1000, jsonMode = false, logLabel = "OpenAI" }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      message: "AI features aren't configured yet. Set OPENAI_API_KEY in your environment to enable them.",
    };
  }

  try {
    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        max_tokens: maxTokens,
        messages: [{ role: "system", content: system }, ...messages],
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`OpenAI API error (${logLabel})`, res.status, errText);
      return { ok: false, message: "The AI service is temporarily unavailable. Please try again shortly." };
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    return { ok: true, text };
  } catch (err) {
    console.error(`OpenAI API request failed (${logLabel})`, err);
    return { ok: false, message: "The AI service is temporarily unavailable. Please try again shortly." };
  }
}

function extractQuestionsArray(text) {
  // response_format: json_object guarantees a valid JSON *object*, so we ask
  // the model to wrap the array as {"questions": [...]}. Still fall back to a
  // bare array or a ```json fence, in case the model or config changes.
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end === -1 || end < start) throw new Error("No JSON found in AI response.");
    parsed = JSON.parse(text.slice(start, end + 1));
  }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
  throw new Error("JSON response did not contain a questions array.");
}

// Generates multiple-choice quiz questions grounded strictly in the lesson's
// own mini-text content, in a structured shape the admin quiz builder can
// insert directly.
export async function generateQuizQuestions({ lessonTitle, courseTitle, lessonHtml, count = 5 }) {
  const lessonText = stripHtml(lessonHtml).slice(0, 12000);
  if (lessonText.length < 40) {
    return {
      error: true,
      message: "Add some mini-text content to this lesson first \u2014 the AI needs material to write questions from.",
    };
  }

  const n = Math.min(Math.max(Number(count) || 5, 1), 10);

  const system = `You write multiple-choice exam questions for a Physiology tutoring site, based STRICTLY on the lesson content given below. Every question, option and explanation must be answerable from this content alone \u2014 do not introduce outside facts.

Respond with ONLY a JSON object shaped exactly like this: {"questions": [ ... ]}, containing exactly ${n} question objects, each shaped exactly like this:
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

  const result = await callOpenAI({
    system,
    messages: [{ role: "user", content: `Write the ${n} questions now, as the JSON object described.` }],
    maxTokens: Math.min(400 * n + 300, 4000),
    jsonMode: true,
    logLabel: "quiz generation",
  });

  if (!result.ok) return { error: true, message: result.message };

  let parsed;
  try {
    parsed = extractQuestionsArray(result.text);
  } catch (err) {
    console.error("Failed to parse AI quiz JSON:", err.message, "\nRaw text:", result.text);
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
}

// The site's mini-text content isn't just prose - existing lessons use a small
// set of custom, already-styled HTML "components" (defined in styles.css) for
// things like cause lists and clinical tips. Teaching the model this exact
// vocabulary means generated lessons render natively instead of looking like
// generic AI paragraphs. Delimiters (rather than JSON) are used for the
// response so a large embedded HTML blob never has to survive JSON escaping.
const MINI_TEXT_COMPONENT_GUIDE = `You may use ONLY these pre-styled HTML snippets where they genuinely fit the content - don't force ones that don't apply, and never invent new class names:

- Section heading: <h4 class="mini-section-title">Heading</h4>
- A row of short related terms/pills: <div class="requirement-pills"><span>Term</span><span>Term</span></div>
- A 3-item cause/category grid (exactly 3 children): <div class="cause-grid"><div><span>1</span><h4>Title</h4><p>Description.</p></div><div><span>2</span><h4>Title</h4><p>Description.</p></div><div><span>3</span><h4>Title</h4><p>Description.</p></div></div>
- A 3-item comparison grid, same shape as cause-grid but for contrasting categories: <div class="morph-grid">...(same inner structure as cause-grid)...</div>
- A numbered list of mechanisms/responses: <div class="function-list"><div><span>1</span><p><strong>Point title</strong> Explanation.</p></div><div><span>2</span><p><strong>Point title</strong> Explanation.</p></div></div>
- A left-to-right process flow (2-4 steps): <div class="epo-flow"><div><span>1</span><strong>Step</strong><small>Detail</small></div><b>\u2192</b><div><span>2</span><strong>Step</strong><small>Detail</small></div></div>
- A clinical-relevance box: <div class="clinical-box"><span>Clinical relevance</span><div><p><strong>Point</strong> Detail.</p><p><strong>Point</strong> Detail.</p></div></div>
- An exam-tip summary box (use at the end): <div class="mini-summary exam-summary"><span>Examination tip</span><p>Tip text.</p></div>

Structure: start with <h3>{Lesson title}</h3> then an introductory <p>, then 2-4 of the components above that best fit this specific content, then optionally the exam-tip box to close.`;

// Generates a full draft of a lesson's content (mini-text + video/answer
// blurb copy) from just a title and a short description, so an admin doesn't
// have to hand-write every field. Uses delimited sections rather than JSON
// because the mini-text HTML block is long and JSON-escaping large HTML is
// fragile.
export async function generateLessonContent({
  title,
  description,
  courseTitle,
  wantsVideoCopy,
  wantsAnswerCopy,
}) {
  if (!description || description.trim().length < 10) {
    return {
      error: true,
      message: "Add a short description of what this lesson should cover \u2014 the AI needs a starting point.",
    };
  }

  const system = `You write lesson content for MedPhysio Tutorials, a Physiology tutoring site for university and medical students. The house style is mechanism-focused, precise, and exam-oriented - never vague or fluffy, and never padded with filler sentences.

Write STRICTLY from the lesson title and description given below - do not invent clinical facts beyond well-established, standard physiology consistent with that description.

${MINI_TEXT_COMPONENT_GUIDE}

Respond with ONLY these delimited sections, in exactly this order, nothing before or after:
===MINI_TEXT_HTML===
(the HTML content, as described above)
===VIDEO_TITLE===
(a short, specific video title for the full-lecture video on this topic, e.g. "Anaemia Explained: Causes, Classification and Physiological Responses")
===VIDEO_DESC===
(one sentence describing what the video covers)
===ANSWER_TITLE===
(a title for a "how to write a structured exam answer" video on this topic, following the pattern "How to Write a Structured Answer on {Topic}")
===ANSWER_DESC===
(one sentence describing the exam-answer framework the video teaches)
===END===`;

  const user = `Lesson title: "${title}"
Course: "${courseTitle}"
Description of what this lesson should cover: "${description.trim()}"

Write all five sections now.`;

  const result = await callOpenAI({
    system,
    messages: [{ role: "user", content: user }],
    maxTokens: 2500,
    logLabel: "lesson generation",
  });

  if (!result.ok) return { error: true, message: result.message };

  const sections = parseDelimitedSections(result.text, [
    "MINI_TEXT_HTML",
    "VIDEO_TITLE",
    "VIDEO_DESC",
    "ANSWER_TITLE",
    "ANSWER_DESC",
  ]);

  if (!sections.MINI_TEXT_HTML) {
    console.error("AI lesson generation: missing mini-text section. Raw text:", result.text);
    return { error: true, message: "The AI returned an unexpected format. Please try again." };
  }

  return {
    error: false,
    miniTextHtml: sections.MINI_TEXT_HTML,
    videoTitle: wantsVideoCopy ? sections.VIDEO_TITLE || "" : "",
    videoDesc: wantsVideoCopy ? sections.VIDEO_DESC || "" : "",
    answerTitle: wantsAnswerCopy ? sections.ANSWER_TITLE || "" : "",
    answerDesc: wantsAnswerCopy ? sections.ANSWER_DESC || "" : "",
  };
}

function parseDelimitedSections(text, names) {
  const result = {};
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const nextName = names[i + 1];
    const startMarker = `===${name}===`;
    const endMarker = nextName ? `===${nextName}===` : "===END===";
    const start = text.indexOf(startMarker);
    if (start === -1) continue;
    const contentStart = start + startMarker.length;
    let end = text.indexOf(endMarker, contentStart);
    if (end === -1) end = text.length;
    result[name] = text.slice(contentStart, end).trim();
  }
  return result;
}

export async function askAboutLesson({ lessonTitle, courseTitle, lessonHtml, question, history = [] }) {
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

  const result = await callOpenAI({
    system,
    messages,
    maxTokens: 600,
    logLabel: "lesson Q&A",
  });

  if (!result.ok) return { error: true, message: result.message };
  return {
    error: false,
    message: result.text || "I couldn't generate a response — please try rephrasing your question.",
  };
}
