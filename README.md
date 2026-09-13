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
- AI Q&A per lesson (calls the OpenAI API)

**Tier 2 — Quiz engine, progress, grounded AI, cleaner admin**
- Multi-question quiz engine per lesson, graded server-side
- Per-student progress tracking (which sections are done, quiz scores)
- AI assistant is grounded strictly in that lesson's own text and refuses to
  answer from outside knowledge
- A proper admin UI (tables, forms, a lesson content editor, a quiz builder)
- **AI-generated quiz questions**: a "Generate with AI" button in the quiz
  builder writes multiple-choice questions (with distractors, a correct
  answer, and an explanation) straight from the lesson's own mini-text, which
  you can then review, edit or delete like any manually-added question
- **AI-generated topics**: a "Generate a whole topic with AI" panel on the
  course page creates a new topic and lesson from just a title and a short
  description \u2014 paste any video/voice/answer links you have (they're
  normalized to embeddable URLs automatically) and the AI drafts the
  mini-text and video blurbs using the site's own component vocabulary
  (cause grids, clinical-relevance boxes, exam-tip callouts, etc.), so
  generated lessons render natively instead of looking like generic AI
  paragraphs. You're dropped straight into the lesson editor afterwards to
  review and adjust anything before it goes live.
- Lecturers can create and manage entire courses themselves — new topics,
  lessons, and quizzes — scoped to courses they own; admins can manage every
  course and assign lecturers to any of them

**Tier 3 — Subscription payments, multi-lecturer, analytics, launch**
- One site-wide subscription (via **Paystack**) unlocks every course, rather
  than paying per course — a student subscribes once and gets full access
- Lecturer accounts that can manage only their own courses; admins manage
  everything
- An analytics dashboard (active subscribers, revenue, average quiz scores,
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
| `OPENAI_API_KEY` | AI Q&A, quiz + lesson generation | Get one at platform.openai.com/api-keys |
| `OPENAI_MODEL` | AI features | Optional, defaults to `gpt-5.6-terra` |
| `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` | Subscriptions | From dashboard.paystack.com > Settings > API Keys & Webhooks |
| `SUBSCRIPTION_PRICE_MINOR` | Subscriptions | Price in the currency's smallest unit — kobo for NGN. `500000` = ₦5,000 |
| `PAYSTACK_CURRENCY` | Subscriptions | Defaults to `NGN` |
| `PAYSTACK_PLAN_CODE` | Subscriptions (optional) | A Paystack Plan code for auto-renewing billing — see below |
| `SUBSCRIPTION_ACCESS_DAYS` | Subscriptions | Days of access per payment when there's no Plan code. Defaults to 30 |
| `NEXT_PUBLIC_SITE_URL` | Subscriptions | Used to build the Paystack redirect-back URL |

The app runs fine with only `AUTH_SECRET` set — AI Q&A and subscriptions
degrade gracefully (clear error messages) until their keys are added, so you
can launch Tier 1/2 features immediately and turn on Tier 3 later.

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
- `lib/paystack.js` + `lib/subscriptions.js` + `app/api/paystack/*` — the
  site-wide subscription flow: starting checkout, verifying payment, and
  activating/extending a student's access. See "How the subscription works"
  below.
- `app/courses/[courseSlug]/[lessonSlug]/LessonWorkspace.js` — the actual
  learning UI: the five-tab lesson (mini-text, voice, full lecture,
  structured answer, quiz) plus the "Ask AI" panel, all driven by real data.
- `app/admin/**` — the admin panel: course/topic/lesson CRUD, the quiz
  builder, lecturer management, and the analytics dashboard.

### How the subscription works

This is **one subscription for the whole site**, not per-course purchases.
Each course has a `requires_subscription` flag (toggle it in the admin course
settings) — free/preview courses stay open to everyone, everything else
requires an active subscription.

**Payment is by direct bank transfer, verified manually by an admin** (not
Paystack — the Paystack code is still in the repo and can be wired back up
later if you want card payments, but it isn't linked from the UI):

1. An admin sets the bank account students should transfer to from
   **/admin/payments** (bank name, account name, account number, plus an
   optional note). This is stored in the `settings` table.
2. A logged-in student visiting **/subscribe** sees those bank details, makes
   the transfer themselves, then fills in a short form (their account name,
   account number, bank name, amount, date paid, and an optional receipt
   image/PDF) which is saved to `payment_submissions` with status `PENDING`.
   After submitting, they're shown a **"Send receipt on WhatsApp"** button
   (`wa.me` link) so they can also forward proof of payment directly for
   faster confirmation.
3. The admin reviews pending submissions on **/admin/payments** — each row
   shows the student, the payer's bank details, the amount, and a link to
   the uploaded receipt (saved under `public/uploads/receipts/`). Clicking
   **Verify** activates the student's subscription immediately (via the same
   `activateSubscriptionFromPayment` used by the old Paystack flow, so it's
   idempotent per submission); **Reject** marks it rejected with an optional
   note the student sees so they can correct and resubmit.
4. Access is a simple check: `lib/queries.js#isSubscribed(userId)` compares
   `users.subscription_expires_at` to the current time — same as before.
   A verified bank transfer grants `SUBSCRIPTION_ACCESS_DAYS` (30 by default)
   of access, same as a manual (non-plan) Paystack payment would.

<details>
<summary>The original Paystack (card payment) flow, for reference</summary>

1. A logged-in student clicks **Subscribe** and hits `POST
   /api/paystack/checkout`, which calls Paystack's Initialize Transaction API
   and redirects them to Paystack's hosted payment page.
2. After paying, Paystack redirects back to `/subscribe/success?reference=...`.
   That page immediately calls `POST /api/paystack/verify` with the
   reference, so the student sees confirmation right away rather than waiting
   on a webhook.
3. Independently, Paystack also sends a `charge.success` webhook to
   `POST /api/paystack/webhook`. This is the source of truth for recurring
   renewals and covers the case where the student closes the tab before the
   verify call finishes. The signature is checked with HMAC-SHA512 using
   `PAYSTACK_SECRET_KEY`.
4. Both paths funnel into `lib/subscriptions.js#activateSubscriptionFromPayment`,
   which is **idempotent** (keyed on the Paystack transaction `reference`),
   so it's safe for the verify call and the webhook to both fire for the same
   payment.
5. Access is a simple check: `lib/queries.js#isSubscribed(userId)` compares
   `users.subscription_expires_at` to the current time. No separate
   "enrollment" step is needed — the `enrollments` table still exists, but
   it's just bookkeeping for "which courses has this student opened" (used
   to populate their dashboard), not an access gate.

**Auto-renewing vs. manual renewal:** if you create a
[Paystack Plan](https://dashboard.paystack.com/#/plans) and set its code in
`PAYSTACK_PLAN_CODE`, Paystack will automatically charge the student again at
the plan's interval and send follow-up webhook events — real recurring
billing. Without a plan code, a successful payment simply grants
`SUBSCRIPTION_ACCESS_DAYS` (30 by default) of access, and the student pays
again manually to renew — simpler to set up, no dashboard configuration
required, but not automatic.

</details>

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

**Paystack webhook in production:** in your Paystack dashboard, go to
Settings > API Keys & Webhooks and set the webhook URL to
`https://yourdomain.com/api/paystack/webhook`. Paystack signs webhook
requests with your secret key itself (no separate webhook secret to copy) —
just make sure `PAYSTACK_SECRET_KEY` is set correctly in production.

**Before launch:**
- Change the seeded admin password (log in, and update it directly via the
  database, or wire up a password-change form — not included yet).
- Set a real, random `AUTH_SECRET`.
- Set your real `SUBSCRIPTION_PRICE_MINOR` and, if you want auto-renewing
  billing, create a Paystack Plan and set `PAYSTACK_PLAN_CODE`.
- Decide which courses (if any) should stay free previews via the
  "Requires an active subscription" toggle in each course's admin settings.

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
