"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
      <label htmlFor="name">Full name</label>
      <div>
        <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <label htmlFor="email" style={{ marginTop: 14 }}>
        Email address
      </label>
      <div>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <label htmlFor="password" style={{ marginTop: 14 }}>
        Password (min. 8 characters)
      </label>
      <div>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p style={{ color: "#c0392b", fontSize: 12, marginTop: 10 }}>{error}</p>}
      <button className="button" type="submit" disabled={loading} style={{ marginTop: 18, width: "100%" }}>
        {loading ? "Creating account\u2026" : "Create account"}
      </button>
    </form>
  );
}
