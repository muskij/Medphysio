"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_CLASS = { PENDING: "", VERIFIED: "verified", REJECTED: "rejected" };

export default function PaymentsTable({ submissions }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  async function act(id, action) {
    setError("");
    let note = "";
    if (action === "reject") {
      note = window.prompt("Optional note for the student (why it wasn't approved):") || "";
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/payments/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (submissions.length === 0) {
    return <p style={{ color: "#8fa2a5" }}>No payment submissions yet.</p>;
  }

  return (
    <div>
      {error && <p className="admin-error">{error}</p>}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Paid from</th>
            <th>Amount</th>
            <th>Receipt</th>
            <th>Status</th>
            <th>Submitted</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s.id}>
              <td>
                {s.user_name}
                <br />
                <small style={{ color: "#8fa2a5" }}>{s.user_email}</small>
              </td>
              <td>
                {s.payer_name}
                <br />
                <small style={{ color: "#8fa2a5" }}>
                  {s.payer_account_number} &middot; {s.payer_bank_name}
                </small>
              </td>
              <td>{s.amount || "\u2014"}</td>
              <td>
                {s.receipt_path ? (
                  <a href={s.receipt_path} target="_blank" rel="noopener noreferrer">
                    View
                  </a>
                ) : (
                  <span style={{ color: "#c2ccce" }}>None</span>
                )}
              </td>
              <td>
                <span className={`admin-pill ${STATUS_CLASS[s.status]}`}>{s.status}</span>
              </td>
              <td>
                <small>{new Date(s.created_at).toLocaleString()}</small>
              </td>
              <td>
                {s.status === "PENDING" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="admin-btn"
                      disabled={busyId === s.id}
                      onClick={() => act(s.id, "verify")}
                    >
                      Verify
                    </button>
                    <button
                      className="admin-btn danger"
                      disabled={busyId === s.id}
                      onClick={() => act(s.id, "reject")}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
