import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "mp_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecretKey() {
  const secret = process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user) {
  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch {
    return null;
  }
}

// Server Component / Route Handler helper: read the logged-in user from cookies.
// next/headers is imported dynamically so this file can also be loaded by
// standalone scripts (e.g. scripts/seed-accounts.mjs) outside the Next.js runtime.
// lib/queries.js is imported dynamically for the same reason - it pulls in
// lib/db.js, which is fine at request time but is unrelated overhead for
// scripts that only need hashPassword/verifyPassword.
export async function getSessionUser() {
  const { cookies } = await import("next/headers");
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  // The JWT is only proof of who the user WAS when it was issued - it can
  // outlive the account it names by weeks (a session cookie survives a
  // Railway redeploy that wipes the SQLite database). Every route that
  // trusts `user.id` for a foreign-key write (enrollments, progress, quiz
  // attempts, etc.) will throw SQLITE_CONSTRAINT_FOREIGNKEY the moment that
  // happens. So: confirm the account still exists on every call, and treat
  // a missing account as "not logged in" rather than crashing downstream.
  const { getUserById } = await import("./queries.js");
  const dbUser = getUserById(payload.id);
  if (!dbUser) return null;

  return { id: dbUser.id, name: dbUser.name, email: dbUser.email, role: dbUser.role };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
