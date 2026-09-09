# MedPhysio Tutorials Platform

A full-stack rebuild of the MedPhysio Tutorials static site into a real course
platform: admin panel, student accounts, a quiz engine, progress tracking, an
AI assistant grounded in each lesson's own content, payments, multi-lecturer
support and an analytics dashboard.

Built with **Next.js 14 (App Router)** and **SQLite** (via `better-sqlite3` —
no external database server to install). It runs anywhere Node.js runs, and
can be pointed at a hosted Postgres database later with minimal changes if
you outgrow SQLite.

## What's included, by tier

**Tier 1 — Admin + accounts + basic AI**
- Admin panel to create courses, topics ("modules") and lessons
- Student registration/login (email + password)
- AI Q&A per lesson (calls the Anthropic API)

**Tier 2 — Quiz engine, progress, grounded AI, cleaner admin**
- Multi-question quiz engine per lesson, graded server-side
- Per-student progress tracking (which sections are done, quiz scores)
- AI assistant is grounded strictly in that lesson's own text and refuses to
  answer from outside knowledge
- A proper admin UI (tables, forms, a lesson content editor, a quiz builder)

**Tier 3 — Payments, multi-lecturer, analytics, launch**
- Stripe Checkout for paid courses, with a webhook that unlocks access
- Lecturer accounts that can manage only their own courses; admins manage
  everything
- An analytics dashboard (enrollments, revenue, average quiz scores,
  completions) with charts
- This README's deployment section

## 1. Install and run locally

```bash
npm install
cp .env.example .env.local     # then fill in the values below
npm run seed:accounts          # creates a default admin login
npm run migrate:static -- /path/to/medphysio-tutorials-static-site/medphysio-static
npm run dev
```

Open http://localhost:3000. Log in at `/login` with the admin account printed
by `seed:accounts` (default: `admin@medphysio.test` / `changeme123` — change
this immediately in a real deployment, see below).

The `migrate:static` command is optional but recommended: point it at the
folder containing the original static site's `index.html` and `courses/`
folder, and it will parse every existing lesson (mini-text, voice note,
video, structured answer, quiz question) into the database automatically, so
you don't have to retype your existing content. It's safe to re-run; it skips
any course whose slug already exists.

### Environment variables (`.env.local`)

| Variable | Required for | Notes |
|---|---|---|
| `AUTH_SECRET` | Everything | Long random string signing login sessions |
| `ANTHROPIC_API_KEY` | AI Q&A | Get one at console.anthropic.com |
| `ANTHROPIC_MODEL` | AI Q&A | Optional, defaults to `claude-sonnet-5` |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | Paid courses | From your Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Paid courses | From the Stripe CLI or webhook settings |
| `NEXT_PUBLIC_SITE_URL` | Paid courses | Used to build Stripe redirect URLs |

The app runs fine with only `AUTH_SECRET` set — AI Q&A and payments degrade
gracefully (clear error messages) until their keys are added, so you can
launch Tier 1/2 features immediately and turn on Tier 3 later.

**Troubleshooting `npm install`:** if you see an error about `node-gyp
rebuild` failing for `better-sqlite3`, it's almost always safe to ignore —
that package ships a working prebuilt binary for common platforms
(`node_modules/better-sqlite3/prebuilds/`), and `npm run dev` / `npm run
build` will still work. If it genuinely doesn't work on your platform,
install Python 3 and your OS's C++ build tools, and make sure you have a
normal internet connection (it needs to reach `nodejs.org` once).

## 2. How the pieces fit together

- `lib/db.js` — opens the SQLite file at `data/medphysio.db` and creates the
  schema on first run. No migrations tool; it's all `CREATE TABLE IF NOT
  EXISTS`, so schema changes are additive (add a new `ALTER TABLE` block here
  if you add a column later).
- `lib/auth.js` — password hashing (bcrypt) and signed session cookies (JWT
  via `jose`), readable from both regular Next.js code and Edge middleware.
- `middleware.js` — blocks `/admin/**` to non-staff and `/dashboard/**` to
  logged-out visitors.
- `lib/ai.js` — the grounded AI assistant. It sends only the requested
  lesson's own mini-text as context and instructs the model to say when a
  question falls outside it, rather than answering from general knowledge.
- `lib/stripe.js` + `app/api/stripe/*` — Checkout session creation and the
  webhook that activates enrollment after payment.
- `app/courses/[courseSlug]/[lessonSlug]/LessonWorkspace.js` — the actual
  learning UI: the five-tab lesson (mini-text, voice, full lecture,
  structured answer, quiz) plus the "Ask AI" panel, all driven by real data.
- `app/admin/**` — the admin panel: course/topic/lesson CRUD, the quiz
  builder, lecturer management, and the analytics dashboard.

## 3. Deploying

The simplest path is **Vercel** for the app plus a small managed Postgres
database once you have real traffic (SQLite is great for launch and for a
single-instance deployment, but Vercel's filesystem is not persistent across
deploys, so a file-based database won't survive a redeploy there).

**Option A — keep SQLite, deploy to a persistent server** (a small VM,
Railway, Render, Fly.io, or similar with a persistent disk):
1. `npm run build`
2. Set the environment variables from the table above on the host.
3. Make sure the `data/` folder is on a persistent volume.
4. `npm start`

**Option B — move to Postgres for Vercel/serverless hosting:**
1. Provision a Postgres database (Neon, Supabase, or Vercel Postgres all work).
2. Swap `lib/db.js` for a Postgres client (e.g. `pg` or `postgres.js`) using
   the same table definitions — the SQL in `lib/db.js` and `lib/queries.js`
   is close to standard SQL already; the main changes are `?` placeholders
   becoming `$1, $2, ...` and `datetime('now')` becoming `now()`.
3. Everything else (routes, pages, components) is unchanged, since they all
   go through `lib/db.js` and `lib/queries.js`.

**Stripe webhook in production:** point your Stripe webhook endpoint at
`https://yourdomain.com/api/stripe/webhook` and put the signing secret it
gives you into `STRIPE_WEBHOOK_SECRET`.

**Before launch:**
- Change the seeded admin password (log in, and update it directly via the
  database, or wire up a password-change form — not included yet).
- Set a real, random `AUTH_SECRET`.
- Decide on real course pricing and add courses via the admin panel or the
  migration script.

## 4. What's intentionally left simple (and how to extend it)

- **Rich text editing** — the lesson content editor uses a plain HTML
  textarea rather than a WYSIWYG editor. This keeps the admin panel simple
  to build on; if you want a visual editor, swap that one `<textarea>` in
  `app/admin/lessons/[id]/LessonEditor.js` for something like TipTap.
- **File uploads** — voice notes and videos are linked via external embed
  URLs (Google Drive, YouTube), matching how the original static site worked.
  Direct file upload would need object storage (e.g. S3 or Vercel Blob).
- **Password reset / email** — not included; there's no transactional email
  set up yet. Adding it (e.g. via Resend or Postmark) is a small, isolated
  addition to `app/api/auth/`.
- **Reordering modules/lessons via drag-and-drop** — currently reorder by
  editing the `position` column directly, or delete-and-recreate in the
  admin panel; the API already accepts a `position` field.
