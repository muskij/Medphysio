import { db } from "../lib/db.js";
import { newId } from "../lib/ids.js";
import { hashPassword } from "../lib/auth.js";
import { getUserByEmail } from "../lib/queries.js";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@medphysio.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "changeme123";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "MedPhysio Admin";

const existing = getUserByEmail(ADMIN_EMAIL);
if (existing) {
  console.log(`Admin account already exists: ${ADMIN_EMAIL}`);
} else {
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  db.prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'ADMIN')").run(
    newId(),
    ADMIN_NAME,
    ADMIN_EMAIL.toLowerCase(),
    passwordHash
  );
  console.log(`Created admin account:\n  email: ${ADMIN_EMAIL}\n  password: ${ADMIN_PASSWORD}\n\nLog in at /login and change the password by creating a new account flow, or update it directly in the database.`);
}
