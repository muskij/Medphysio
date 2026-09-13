"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BankDetailsForm({ bank }) {
  const router = useRouter();
  const [bankName, setBankName] = useState(bank.bankName || "");
  const [accountName, setAccountName] = useState(bank.accountName || "");
  const [accountNumber, setAccountNumber] = useState(bank.accountNumber || "");
  const [note, setNote] = useState(bank.note || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName, accountName, accountNumber, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <label htmlFor="bankName">Bank name</label>
      <input id="bankName" type="text" required value={bankName} onChange={(e) => setBankName(e.target.value)} />
      <label htmlFor="accountName">Account name</label>
      <input
        id="accountName"
        type="text"
        required
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
      />
      <label htmlFor="accountNumber">Account number</label>
      <input
        id="accountNumber"
        type="text"
        required
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
      />
      <label htmlFor="note">Note to students (optional)</label>
      <textarea
        id="note"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Please use your email address as the transfer narration"
      />
      {error && <p className="admin-error">{error}</p>}
      {saved && !error && <p className="admin-success">Saved.</p>}
      <button className="admin-btn" type="submit" disabled={loading} style={{ marginTop: 16 }}>
        {loading ? "Saving\u2026" : "Save bank details"}
      </button>
    </form>
  );
}
