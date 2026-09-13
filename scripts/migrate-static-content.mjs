// Imports the real course/lesson content from the original static HTML site
// (medphysio-tutorials-static-site.zip) into the platform database.
//
// Usage:  npm run migrate:static -- /path/to/medphysio-static
//
import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { db } from "../lib/db.js";
import { newId, slugify } from "../lib/ids.js";

const staticRoot = process.argv[2];
if (!staticRoot || !fs.existsSync(staticRoot)) {
  console.error("Usage: npm run migrate:static -- /path/to/medphysio-static (folder containing index.html + courses/)");
  process.exit(1);
}

const coursesDir = path.join(staticRoot, "courses");
if (!fs.existsSync(coursesDir)) {
  console.error(`No "courses" folder found inside ${staticRoot}`);
  process.exit(1);
}

function readCourseMeta(courseSlug) {
  const html = fs.readFileSync(path.join(coursesDir, courseSlug, "index.html"), "utf8");
  const $ = cheerio.load(html);
  const title = $(".course-hero-copy h1").text().trim().replace(/\s+/g, " ");
  const description = $(".course-hero-copy > p").first().text().trim();
  // Module order + titles, and the lesson folder each module links to.
  const modules = [];
  $(".module-heading").each((i, el) => {
    const $heading = $(el);
    const moduleTitle = $heading.find(".module-title strong").text().trim();
    const $body = $heading.next(".module-body");
    const href = $body.find("a.resource").first().attr("href");
    const lessonFolder = href ? href.replace(/\/$/, "") : null;
    modules.push({ title: moduleTitle, lessonFolder });
  });
  return { title, description, modules };
}

function readLesson(courseSlug, lessonFolder) {
  const lessonPath = path.join(coursesDir, courseSlug, lessonFolder, "index.html");
  if (!fs.existsSync(lessonPath)) return null;
  const html = fs.readFileSync(lessonPath, "utf8");
  const $ = cheerio.load(html);

  const title = $("h1").first().text().trim();

  const $mini = $('[data-panel="mini"]').first();
  const miniTextHtml = $mini.length ? $mini.html().trim() : "";

  const $voice = $('[data-panel="voice"]').first();
  const voiceEmbedUrl = $voice.find("iframe").attr("src") || "";
  const voiceLinkUrl = $voice.find("a").attr("href") || "";

  const $full = $('[data-panel="full"]').first();
  const videoEmbedUrl = $full.find("iframe").attr("src") || "";
  const videoTitle = $full.find(".video-lesson-details h3").text().trim();
  const videoDesc = $full.find(".video-lesson-details p").text().trim();
  const videoLinkUrl = $full.find(".video-lesson-details a").attr("href") || "";

  const $answer = $('[data-panel="answer"]').first();
  const answerEmbedUrl = $answer.find("iframe").attr("src") || "";
  const answerTitle = $answer.find(".video-lesson-details h3").text().trim();
  const answerDesc = $answer.find(".video-lesson-details p").text().trim();
  const answerLinkUrl = $answer.find(".video-lesson-details a").attr("href") || "";

  const $quiz = $('[data-panel="quiz"]').first();
  let question = null;
  if ($quiz.length) {
    const questionText = $quiz.find("h3").text().trim();
    const correctIndex = parseInt($quiz.attr("data-answer") || "0", 10);
    const explanation = $quiz.find(".answer-feedback p").text().trim();
    const options = [];
    $quiz.find(".answer-options button").each((i, btn) => {
      const label = $(btn).find("span").text().trim() || String.fromCharCode(65 + i);
      const text = $(btn)
        .clone()
        .find("span")
        .remove()
        .end()
        .text()
        .trim();
      options.push({ label, text, isCorrect: i === correctIndex });
    });
    if (options.length) question = { question: questionText, explanation, options };
  }

  return {
    title,
    miniTextHtml,
    voiceEmbedUrl,
    voiceLinkUrl,
    videoEmbedUrl,
    videoTitle,
    videoDesc,
    videoLinkUrl,
    answerEmbedUrl,
    answerTitle,
    answerDesc,
    answerLinkUrl,
    question,
  };
}

const courseSlugs = fs
  .readdirSync(coursesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const insertCourse = db.prepare(
  "INSERT INTO courses (id, slug, title, description, price_cents, published) VALUES (?, ?, ?, ?, 0, 1)"
);
const insertModule = db.prepare("INSERT INTO modules (id, course_id, title, position) VALUES (?, ?, ?, ?)");
const insertLesson = db.prepare(
  `INSERT INTO lessons (id, module_id, slug, title, position, mini_text_html, voice_embed_url, voice_link_url,
     video_embed_url, video_link_url, video_title, video_desc, answer_embed_url, answer_link_url, answer_title, answer_desc)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const insertQuestion = db.prepare(
  "INSERT INTO quiz_questions (id, lesson_id, question, explanation, position) VALUES (?, ?, ?, ?, 0)"
);
const insertOption = db.prepare(
  "INSERT INTO quiz_options (id, question_id, label, text, is_correct, position) VALUES (?, ?, ?, ?, ?, ?)"
);

let importedCourses = 0;
let importedLessons = 0;

const run = db.transaction(() => {
  for (const courseSlug of courseSlugs) {
    const existing = db.prepare("SELECT id FROM courses WHERE slug = ?").get(courseSlug);
    if (existing) {
      console.log(`Skipping "${courseSlug}" \u2014 a course with that slug already exists.`);
      continue;
    }

    const meta = readCourseMeta(courseSlug);
    const courseId = newId();
    insertCourse.run(courseId, courseSlug, meta.title || courseSlug, meta.description || "");
    importedCourses += 1;

    meta.modules.forEach((mod, mi) => {
      if (!mod.lessonFolder) return;
      const moduleId = newId();
      insertModule.run(moduleId, courseId, mod.title || `Topic ${mi + 1}`, mi);

      const lesson = readLesson(courseSlug, mod.lessonFolder);
      if (!lesson) return;

      const lessonId = newId();
      const slug = slugify(mod.lessonFolder);
      insertLesson.run(
        lessonId,
        moduleId,
        slug,
        lesson.title || mod.title,
        0,
        lesson.miniTextHtml,
        lesson.voiceEmbedUrl,
        lesson.voiceLinkUrl,
        lesson.videoEmbedUrl,
        lesson.videoLinkUrl,
        lesson.videoTitle,
        lesson.videoDesc,
        lesson.answerEmbedUrl,
        lesson.answerLinkUrl,
        lesson.answerTitle,
        lesson.answerDesc
      );
      importedLessons += 1;

      if (lesson.question) {
        const questionId = newId();
        insertQuestion.run(questionId, lessonId, lesson.question.question, lesson.question.explanation);
        lesson.question.options.forEach((opt, i) => {
          insertOption.run(newId(), questionId, opt.label, opt.text, opt.isCorrect ? 1 : 0, i);
        });
      }
    });
  }
});

run();

console.log(`\nImported ${importedCourses} course(s) and ${importedLessons} lesson(s) from ${staticRoot}.`);
console.log(`Each imported lesson carried over its single existing quiz question \u2014 add more from the admin panel.`);
