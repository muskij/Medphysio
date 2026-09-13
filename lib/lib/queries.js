import { db } from "./db.js";

// ---------- Users ----------
export const getUserByEmail = (email) =>
  db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());

export const getUserById = (id) => db.prepare("SELECT * FROM users WHERE id = ?").get(id);

export const listLecturers = () =>
  db.prepare("SELECT id, name, email, created_at FROM users WHERE role = 'LECTURER' ORDER BY created_at DESC").all();

export const listStudentsCount = () =>
  db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'STUDENT'").get().n;

// ---------- Courses ----------
export const listCourses = ({ publishedOnly = false } = {}) => {
  const sql = `
    SELECT c.*, u.name AS lecturer_name,
      (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) AS module_count,
      (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) AS lesson_count,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'ACTIVE') AS enrolled_count
    FROM courses c LEFT JOIN users u ON u.id = c.lecturer_id
    ${publishedOnly ? "WHERE c.published = 1" : ""}
    ORDER BY c.created_at DESC`;
  return db.prepare(sql).all();
};

export const getCourseBySlug = (slug) =>
  db
    .prepare(
      `SELECT c.*, u.name AS lecturer_name FROM courses c LEFT JOIN users u ON u.id = c.lecturer_id WHERE c.slug = ?`
    )
    .get(slug);

export const getCourseById = (id) => db.prepare("SELECT * FROM courses WHERE id = ?").get(id);

export const getModulesForCourse = (courseId) =>
  db.prepare("SELECT * FROM modules WHERE course_id = ? ORDER BY position ASC").all(courseId);

export const getLessonsForModule = (moduleId) =>
  db.prepare("SELECT * FROM lessons WHERE module_id = ? ORDER BY position ASC").all(moduleId);

// Full course tree: modules -> lessons (lightweight fields only)
export function getCourseTree(courseId) {
  const modules = getModulesForCourse(courseId);
  return modules.map((m) => ({
    ...m,
    lessons: db
      .prepare(
        "SELECT id, slug, title, position, free_preview FROM lessons WHERE module_id = ? ORDER BY position ASC"
      )
      .all(m.id),
  }));
}

// ---------- Lessons ----------
export const getLessonBySlugs = (courseSlug, lessonSlug) =>
  db
    .prepare(
      `SELECT l.*, m.course_id AS course_id, m.title AS module_title, m.id AS module_id
       FROM lessons l
       JOIN modules m ON l.module_id = m.id
       JOIN courses c ON m.course_id = c.id
       WHERE c.slug = ? AND l.slug = ?`
    )
    .get(courseSlug, lessonSlug);

export const getLessonById = (id) =>
  db
    .prepare(
      `SELECT l.*, m.course_id AS course_id FROM lessons l JOIN modules m ON l.module_id = m.id WHERE l.id = ?`
    )
    .get(id);

export const getQuizQuestions = (lessonId) => {
  const questions = db
    .prepare("SELECT * FROM quiz_questions WHERE lesson_id = ? ORDER BY position ASC")
    .all(lessonId);
  return questions.map((q) => ({
    ...q,
    options: db
      .prepare("SELECT * FROM quiz_options WHERE question_id = ? ORDER BY position ASC")
      .all(q.id),
  }));
};

// ---------- Subscription (site-wide) ----------
export const getSubscriptionInfo = (userId) =>
  db
    .prepare("SELECT subscription_status, subscription_expires_at, paystack_customer_code FROM users WHERE id = ?")
    .get(userId);

export function isSubscribed(userId) {
  const row = getSubscriptionInfo(userId);
  if (!row || !row.subscription_expires_at) return false;
  return new Date(row.subscription_expires_at).getTime() > Date.now();
}

// ---------- Enrollment ----------
export const getEnrollment = (userId, courseId) =>
  db.prepare("SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?").get(userId, courseId);

export const isEnrolled = (userId, courseId) => {
  const e = getEnrollment(userId, courseId);
  return !!(e && e.status === "ACTIVE");
};

// ---------- Progress ----------
export const getLessonProgress = (userId, lessonId) =>
  db.prepare("SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?").get(userId, lessonId);

export const getCourseProgress = (userId, courseId) => {
  const rows = db
    .prepare(
      `SELECT lp.* FROM lesson_progress lp
       JOIN lessons l ON lp.lesson_id = l.id
       JOIN modules m ON l.module_id = m.id
       WHERE lp.user_id = ? AND m.course_id = ?`
    )
    .all(userId, courseId);
  return rows;
};
