"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TransferRequestForm({ receiptWhatsAppNumber, amountMinor, currency }) {
  const router = useRouter();
  const [payerName, setPayerName] = useState("");
  const [payerAccountNumber, setPayerAccountNumber] = useState("");
  const [payerBankName, setPayerBankName] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(null); // holds the submitted values once posted

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/transfer-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payerName, payerAccountNumber, payerBankName, amountMinor, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setSubmitted({ payerName, payerAccountNumber });
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    const digits = receiptWhatsAppNumber.replace(/[^0-9]/g, "");
    const intlPhone = digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
    const message = `Hi, I just submitted a bank transfer for my MedPhysio Tutorials subscription.\nAccount used: ${submitted.payerName} (${submitted.payerAccountNumber})\nI'm attaching my receipt.`;
    const waLink = `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;

    return (
      <div
        style={{
          background: "var(--mint)",
          borderRadius: 12,
          padding: "18px 20px",
          marginTop: 16,
          fontSize: 14,
          lineHeight: 1.8,
        }}
      >
        <strong style={{ color: "var(--navy)" }}>Thanks &mdash; your details are submitted.</strong>
        <p style={{ margin: "6px 0 12px" }}>
          One last step: please send a screenshot of your payment receipt on WhatsApp so we can confirm it quickly.
          (WhatsApp can&rsquo;t attach the photo for you automatically &mdash; you&rsquo;ll need to attach it yourself
          once the chat opens.)
        </p>
        <a href={waLink} target="_blank" rel="noreferrer" className="button">
          Send receipt on WhatsApp &#8594;
        </a>
      </div>
    );
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit} style={{ marginTop: 18, textAlign: "left" }}>
      <label htmlFor="payerName">Account name you paid from</label>
      <input id="payerName" type="text" required value={payerName} onChange={(e) => setPayerName(e.target.value)} />

      <label htmlFor="payerAccountNumber">Account number you paid from</label>
      <input
        id="payerAccountNumber"
        type="text"
        required
        value={payerAccountNumber}
        onChange={(e) => setPayerAccountNumber(e.target.value)}
      />

      <label htmlFor="payerBankName">Your bank (optional)</label>
      <input id="payerBankName" type="text" value={payerBankName} onChange={(e) => setPayerBankName(e.target.value)} />

      <label htmlFor="note">Anything else we should know? (optional)</label>
      <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />

      {error && <p className="admin-error">{error}</p>}

      <button className="admin-btn" type="submit" disabled={loading} style={{ marginTop: 16 }}>
        {loading ? "Submitting\u2026" : `I've transferred ${currency} ${(amountMinor / 100).toLocaleString()}`}
      </button>
    </form>
  );
}
