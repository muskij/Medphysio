"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EnrollButton({ courseId, priceCents }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    try {
      if (priceCents === 0) {
        const res = await fetch("/api/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        router.refresh();
      } else {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="button" onClick={handleClick} disabled={loading}>
        {loading ? "Please wait\u2026" : priceCents === 0 ? "Enroll for free \u2192" : `Enroll \u2014 $${(priceCents / 100).toFixed(2)} \u2192`}
      </button>
      {error && <p style={{ color: "#c0392b", fontSize: 12, marginTop: 10 }}>{error}</p>}
    </div>
  );
}
