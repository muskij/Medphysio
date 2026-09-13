import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { newId, slugify } from "../../../../lib/ids";
import { getCourseById, getModulesForCourse, getQuizQuestions } from "../../../../lib/queries";
import { generateLessonContent, generateQuizQuestions } from "../../../../lib/ai";
import { normalizeVideoLink, normalizeVoiceLink } from "../../../../lib/links";

function canEdit(user, course) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.role === "LECTURER" && course.lecturer_id === user.id;
}

function looksLikeHtml(str) {
  return /<[a-z][\s\S]*>/i.test(str || "");
}

// body: { courseId, title, description, videoLink, voiceLink, answerLink, miniText, quizCount }
// Creates one topic (module) containing one lesson of the same title - matching
// this site's existing 1:1 topic-to-lesson pattern - then fills in as much of
// the lesson as it can: pasted links are normalized to embeddable URLs
// deterministically, and anything left blank (mini-text, video/answer blurb
// copy) is drafted by AI from the title + description. An optional starter
// quiz can be generated in the same step.
export async function POST(req) {
  const user = await getSessionUser();
  const body = await req.json().catch(() => ({}));
  const { courseId, title, description = "", videoLink = "", voiceLink = "", answerLink = "", miniText = "", quizCount = 0 } = body;

  const course = getCourseById(courseId);
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  if (!canEdit(user, course)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!title || !title.trim()) return NextResponse.json({ error: "A topic title is required." }, { status: 400 });

  const video = normalizeVideoLink(videoLink);
  const voice = normalizeVoiceLink(voiceLink);
  const answer = normalizeVideoLink(answerLink);

  let miniTextHtml = miniText && miniText.trim() ? miniText.trim() : "";
  if (miniTextHtml && !looksLikeHtml(miniTextHtml)) {
    // Plain text pasted in - wrap each paragraph so it still renders sensibly.
    miniTextHtml = miniTextHtml
      .split(/\n{2,}/)
      .map((p) => `<p>${p.trim()}</p>`)
      .join("\n");
  }

  let videoTitle = "";
  let videoDesc = "";
  let answerTitle = "";
  let answerDesc = "";

  const needsAiContent = !miniTextHtml || !!video.embedUrl || !!answer.embedUrl;
  if (needsAiContent) {
    if (!description || description.trim().length < 10) {
      return NextResponse.json(
        { error: "Add a short description of what this topic should cover \u2014 the AI needs a starting point." },
        { status: 400 }
      );
    }
    const generated = await generateLessonContent({
      title: title.trim(),
      description,
      courseTitle: course.title,
      wantsVideoCopy: !!video.embedUrl,
      wantsAnswerCopy: !!answer.embedUrl,
    });
    if (generated.error) {
      return NextResponse.json({ error: generated.message }, { status: 502 });
    }
    if (!miniTextHtml) miniTextHtml = generated.miniTextHtml;
    videoTitle = generated.videoTitle;
    videoDesc = generated.videoDesc;
    answerTitle = generated.answerTitle;
    answerDesc = generated.answerDesc;
  }

  // Create the module (topic) and its one lesson.
  const modulePosition = getModulesForCourse(courseId).length;
  const moduleId = newId();
  db.prepare("INSERT INTO modules (id, course_id, title, position) VALUES (?, ?, ?, ?)").run(
    moduleId,
    courseId,
    title.trim(),
    modulePosition
  );

  let slug = slugify(title);
  const clash = db
    .prepare(`SELECT l.id FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = ? AND l.slug = ?`)
    .get(courseId, slug);
  if (clash) slug = `${slug}-${newId().slice(0, 4)}`;

  const lessonId = newId();
  db.prepare(
    `INSERT INTO lessons (
       id, module_id, slug, title, position, mini_text_html,
       voice_embed_url, voice_link_url, video_embed_url, video_link_url, video_title, video_desc,
       answer_embed_url, answer_link_url, answer_title, answer_desc
     ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    lessonId,
    moduleId,
    slug,
    title.trim(),
    miniTextHtml,
    voice.embedUrl,
    voice.linkUrl,
    video.embedUrl,
    video.linkUrl,
    videoTitle,
    videoDesc,
    answer.embedUrl,
    answer.linkUrl,
    answerTitle,
    answerDesc
  );

  let quizGeneratedCount = 0;
  const n = Math.min(Math.max(Number(quizCount) || 0, 0), 10);
  if (n > 0 && miniTextHtml) {
    const quizResult = await generateQuizQuestions({
      lessonTitle: title.trim(),
      courseTitle: course.title,
      lessonHtml: miniTextHtml,
      count: n,
    });
    if (!quizResult.error) {
      const insertQuestion = db.prepare(
        "INSERT INTO quiz_questions (id, lesson_id, question, explanation, position) VALUES (?, ?, ?, ?, ?)"
      );
      const insertOption = db.prepare(
        "INSERT INTO quiz_options (id, question_id, label, text, is_correct, position) VALUES (?, ?, ?, ?, ?, ?)"
      );
      db.transaction(() => {
        quizResult.questions.forEach((q, qi) => {
          const questionId = newId();
          insertQuestion.run(questionId, lessonId, q.question, q.explanation, qi);
          q.options.forEach((opt, oi) => {
            insertOption.run(newId(), questionId, opt.label, opt.text, opt.isCorrect ? 1 : 0, oi);
          });
        });
      })();
      quizGeneratedCount = quizResult.questions.length;
    }
    // If quiz generation fails, we don't fail the whole request - the topic
    // and lesson are already created; the admin can generate a quiz manually
    // from the lesson editor afterwards.
  }

  return NextResponse.json({
    moduleId,
    lessonId,
    lessonSlug: slug,
    courseId,
    courseSlug: course.slug,
    usedAi: needsAiContent,
    quizGeneratedCount,
  });
}
