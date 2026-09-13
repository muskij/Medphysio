"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const WHATSAPP_NUMBER = "2348032429067"; // 08032429067 in international format, no leading 0

export default function BankTransferForm({ user, displayAmount, currency }) {
  const router = useRouter();
  const [payerName, setPayerName] = useState(user?.name || "");
  const [payerAccountNumber, setPayerAccountNumber] = useState("");
  const [payerBankName, setPayerBankName] = useState("");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("payerName", payerName);
      fd.set("payerAccountNumber", payerAccountNumber);
      fd.set("payerBankName", payerBankName);
      fd.set("amount", amount);
      fd.set("paidAt", paidAt);
      fd.set("note", note);
      if (receipt) fd.set("receipt", receipt);

      const res = await fetch("/api/payments", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setSubmitted(true);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const waMessage = encodeURIComponent(
    `Hi MedPhysio Tutorials, I just paid for my subscription.\nName: ${payerName || user?.name || ""}\nEmail: ${
      user?.email || ""
    }\nAmount: ${currency || ""} ${amount || displayAmount || ""}\nI'm attaching my payment receipt.`
  );
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`;

  if (submitted) {
    return (
      <div className="success-message" style={{ flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span>&#10003;</span>
          <div>
            <strong>Payment details received</strong>
            <small>An admin will verify it and activate your subscription shortly.</small>
          </div>
        </div>
        <p style={{ fontSize: 12, color: "#586f73", margin: "6px 0 0" }}>
          To speed things up, send your payment receipt on WhatsApp too:
        </p>
        <a
          className="button small"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ background: "#25D366" }}
        >
          Send receipt on WhatsApp &#8594;
        </a>
      </div>
    );
  }

  return (
    <form className="join-form-card" onSubmit={handleSubmit}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <h4 style={{ margin: 0, color: "var(--navy)" }}>I&rsquo;ve made the transfer &mdash; confirm it here</h4>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
            `Hi MedPhysio Tutorials, I'm on the payment page for my subscription and wanted to reach out.\nName: ${payerName || user?.name || ""}\nEmail: ${user?.email || ""}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="button small"
          style={{ background: "#25D366" }}
        >
          Notify admin on WhatsApp
        </a>
      </div>
      <div className="jf-grid">
        <label>
          Your account name (who paid)
          <input
            type="text"
            required
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
            placeholder="e.g. Jane Doe"
          />
        </label>
        <label>
          Your account number
          <input
            type="text"
            required
            inputMode="numeric"
            value={payerAccountNumber}
            onChange={(e) => setPayerAccountNumber(e.target.value)}
            placeholder="e.g. 0123456789"
          />
        </label>
        <label>
          Your bank name
          <input
            type="text"
            required
            value={payerBankName}
            onChange={(e) => setPayerBankName(e.target.value)}
            placeholder="e.g. GTBank"
          />
        </label>
        <label>
          Amount paid
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={displayAmount ? `${currency} ${displayAmount}` : ""}
          />
        </label>
        <label>
          Date paid
          <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
        </label>
        <label>
          Receipt / screenshot (optional)
          <input type="file" accept="image/*,.pdf" onChange={(e) => setReceipt(e.target.files?.[0] || null)} />
        </label>
      </div>
      <label style={{ display: "block", marginTop: 10 }}>
        Note (optional)
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything else the admin should know" />
      </label>
      {error && <p style={{ color: "#c0392b", fontSize: 12, marginTop: 10 }}>{error}</p>}
      <button className="button" type="submit" disabled={loading} style={{ marginTop: 16 }}>
        {loading ? "Submitting\u2026" : "Submit payment details"}
      </button>
    </form>
  );
}
