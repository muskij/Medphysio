"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      const next = params.get("next");
      if (next) {
        router.push(next);
      } else if (data.user.role === "STUDENT") {
        router.push("/dashboard");
      } else {
        router.push("/admin");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
      <label htmlFor="email">Email address</label>
      <div>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <label htmlFor="password" style={{ marginTop: 14 }}>
        Password
      </label>
      <div>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p style={{ color: "#c0392b", fontSize: 12, marginTop: 10 }}>{error}</p>
      )}
      <button className="button" type="submit" disabled={loading} style={{ marginTop: 18, width: "100%" }}>
        {loading ? "Logging in\u2026" : "Log in"}
      </button>
    </form>
  );
}
