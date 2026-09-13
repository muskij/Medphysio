import { db } from "./db.js";

export function getSetting(key, fallback = "") {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value ?? "");
}

// The bank account details shown to students on the subscribe page, and
// edited by an admin in /admin/payment-settings.
export function getBankDetails() {
  return {
    bankName: getSetting("bank_name"),
    accountName: getSetting("bank_account_name"),
    accountNumber: getSetting("bank_account_number"),
    instructions: getSetting("bank_instructions"),
  };
}

export function setBankDetails({ bankName, accountName, accountNumber, instructions }) {
  setSetting("bank_name", bankName);
  setSetting("bank_account_name", accountName);
  setSetting("bank_account_number", accountNumber);
  setSetting("bank_instructions", instructions);
}

export function bankDetailsConfigured() {
  const d = getBankDetails();
  return !!(d.bankName && d.accountName && d.accountNumber);
}
