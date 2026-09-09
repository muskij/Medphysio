import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "../../../../lib/auth";
import {
  getLessonBySlugs,
  getCourseById,
  getCourseTree,
  isEnrolled,
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

  const isFree = course.price_cents === 0;
  const enrolled = user ? isEnrolled(user.id, course.id) : false;
  const hasAccess = lesson.free_preview || isFree || enrolled;

  if (!hasAccess) {
    redirect(`/courses/${courseSlug}?locked=1`);
  }
  if (!user) {
    redirect(`/login?next=/courses/${courseSlug}/${lessonSlug}`);
  }

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
