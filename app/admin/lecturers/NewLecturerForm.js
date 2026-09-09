"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewLecturerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/lecturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setResult({ email, tempPassword: data.tempPassword });
      setName("");
      setEmail("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form className="admin-form" onSubmit={handleSubmit}>
        <label htmlFor="name">Full name</label>
        <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="email">Email</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {error && <p className="admin-error">{error}</p>}
        <button className="admin-btn" type="submit" disabled={loading} style={{ marginTop: 16 }}>
          {loading ? "Creating\u2026" : "Create lecturer account"}
        </button>
      </form>
      {result && (
        <div className="admin-success" style={{ marginTop: 14, lineHeight: 1.7 }}>
          Account created for <strong>{result.email}</strong>.<br />
          Temporary password: <code>{result.tempPassword}</code>
          <br />
          Share this with them securely &mdash; it won&rsquo;t be shown again.
        </div>
      )}
    </div>
  );
}
