"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PaymentSettingsForm({ initial }) {
  const router = useRouter();
  const [bankName, setBankName] = useState(initial.bankName || "");
  const [accountName, setAccountName] = useState(initial.accountName || "");
  const [accountNumber, setAccountNumber] = useState(initial.accountNumber || "");
  const [instructions, setInstructions] = useState(initial.instructions || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/settings/payment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName, accountName, accountNumber, instructions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setMessage("Saved. Students will now see these details on the subscribe page.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <label htmlFor="bankName">Bank name</label>
      <input id="bankName" type="text" required value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. GTBank" />

      <label htmlFor="accountName">Account name</label>
      <input id="accountName" type="text" required value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g. MedPhysio Tutorials Ltd" />

      <label htmlFor="accountNumber">Account number</label>
      <input id="accountNumber" type="text" required value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="e.g. 0123456789" />

      <label htmlFor="instructions">Extra instructions shown to students (optional)</label>
      <textarea
        id="instructions"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="e.g. Use your registered email as the transfer narration."
      />

      {error && <p className="admin-error">{error}</p>}
      {message && <p className="admin-success">{message}</p>}

      <button className="admin-btn" type="submit" disabled={saving} style={{ marginTop: 16 }}>
        {saving ? "Saving\u2026" : "Save bank details"}
      </button>
    </form>
  );
}
