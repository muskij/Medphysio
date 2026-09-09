"use client";

import { useState } from "react";

export default function SubscribeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/paystack/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="button" onClick={handleClick} disabled={loading}>
        {loading ? "Redirecting to Paystack\u2026" : "Subscribe with Paystack \u2192"}
      </button>
      {error && <p style={{ color: "#c0392b", fontSize: 12, marginTop: 10 }}>{error}</p>}
    </div>
  );
}
