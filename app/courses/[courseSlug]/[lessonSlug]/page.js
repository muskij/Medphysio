import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { newId } from "../../../../lib/ids";
import {
  getLessonBySlugs,
  getCourseById,
  getCourseTree,
  isSubscribed,
  getQuizQuestions,
  getLessonProgress,
} from "../../../../lib/queries";
import LessonWorkspace from "./LessonWorkspace";

export default async function LessonPage({ params }) {
  const { courseSlug, lessonSlug } = params;
  const lesson = getLessonBySlugs(courseSlug, lessonSlug);
  if (!lesson) return notFound();

  const course = getCourseById(lesson.course_id);
  const user = await getSessionUser();

  const isFree = !course.requires_subscription;
  const subscribed = user ? isSubscribed(user.id) : false;
  const hasAccess = lesson.free_preview || isFree || subscribed;

  if (!hasAccess) {
    redirect(`/courses/${courseSlug}?locked=1`);
  }
  if (!user) {
    redirect(`/login?next=/courses/${courseSlug}/${lessonSlug}`);
  }

  // Bookkeeping only (doesn't gate access): remember that this student has opened
  // this course, so it shows up on their dashboard.
  db.prepare(
    `INSERT INTO enrollments (id, user_id, course_id, status) VALUES (?, ?, ?, 'ACTIVE')
     ON CONFLICT(user_id, course_id) DO NOTHING`
  ).run(newId(), user.id, course.id);

  const modules = getCourseTree(course.id);
  const flatLessons = modules.flatMap((m) => m.lessons);
  const currentIndex = flatLessons.findIndex((l) => l.id === lesson.id);
  const nextLesson = flatLessons[currentIndex + 1] || null;
  const moduleIndex = modules.findIndex((m) => m.id === lesson.module_id);

  const questionsRaw = getQuizQuestions(lesson.id);
  // Never send correct-answer flags to the client; grading happens server-side on submit.
  const questions = questionsRaw.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options.map((o) => ({ id: o.id, label: o.label, text: o.text })),
  }));

  const progress = getLessonProgress(user.id, lesson.id);

  return (
    <LessonWorkspace
      course={course}
      lesson={lesson}
      moduleIndex={moduleIndex}
      questions={questions}
      progress={progress}
      nextLesson={nextLesson}
    />
  );
}
