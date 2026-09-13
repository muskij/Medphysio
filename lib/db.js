import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "medphysio.db");

// Reuse a single connection across hot-reloads in dev
const globalForDb = globalThis;
export const db = globalForDb.__medphysio_db || new Database(DB_PATH);
if (process.env.NODE_ENV !== "production") globalForDb.__medphysio_db = db;

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ADMIN','LECTURER','STUDENT')) DEFAULT 'STUDENT',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  price_cents INTEGER NOT NULL DEFAULT 0,
  lecturer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  free_preview INTEGER NOT NULL DEFAULT 0,
  mini_text_html TEXT DEFAULT '',
  voice_embed_url TEXT DEFAULT '',
  voice_link_url TEXT DEFAULT '',
  video_embed_url TEXT DEFAULT '',
  video_link_url TEXT DEFAULT '',
  video_title TEXT DEFAULT '',
  video_desc TEXT DEFAULT '',
  answer_embed_url TEXT DEFAULT '',
  answer_link_url TEXT DEFAULT '',
  answer_title TEXT DEFAULT '',
  answer_desc TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  explanation TEXT DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','PENDING','CANCELLED')),
  stripe_session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  tabs_completed TEXT NOT NULL DEFAULT '[]',
  quiz_best_score INTEGER,
  quiz_total INTEGER,
  quiz_attempts INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscription_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  plan_code TEXT,
  period_end TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Generic key/value store used for admin-configurable settings, e.g. the
-- bank account details shown to students on the subscribe page.
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Bank-transfer payment declarations submitted by students, verified
-- manually by an admin in /admin/payments.
CREATE TABLE IF NOT EXISTS payment_submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount TEXT DEFAULT '',
  payer_name TEXT NOT NULL,
  payer_account_number TEXT NOT NULL,
  payer_bank_name TEXT NOT NULL,
  paid_at TEXT DEFAULT '',
  note TEXT DEFAULT '',
  receipt_path TEXT,
  status TEXT NOT NULL CHECK(status IN ('PENDING','VERIFIED','REJECTED')) DEFAULT 'PENDING',
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  review_note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// --- Additive column migrations (safe to run on every boot) ---
// SQLite has no "ADD COLUMN IF NOT EXISTS", so check pragma table_info first.
// Returns true only when the column was actually just added (first boot after
// upgrading), so one-time backfills below don't re-run and clobber real data
// on every subsequent server start.
function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    return true;
  }
  return false;
}

ensureColumn("users", "subscription_status", "subscription_status TEXT NOT NULL DEFAULT 'INACTIVE'");
ensureColumn("users", "subscription_expires_at", "subscription_expires_at TEXT");
ensureColumn("users", "paystack_customer_code", "paystack_customer_code TEXT");
const requiresSubscriptionJustAdded = ensureColumn(
  "courses",
  "requires_subscription",
  "requires_subscription INTEGER NOT NULL DEFAULT 1"
);

// One-time only: courses that were previously marked $0 under the old
// per-course pricing model start out free under the new subscription model
// too. Runs only the moment the column is created, never again - after that,
// the admin's own toggle in the course settings form is the source of truth.
if (requiresSubscriptionJustAdded) {
  db.exec(`UPDATE courses SET requires_subscription = 0 WHERE price_cents = 0`);
}

export function nowIso() {
  return new Date().toISOString();
}
