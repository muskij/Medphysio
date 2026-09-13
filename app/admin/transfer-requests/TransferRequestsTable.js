"use client";

import { useState } from "react";

function StatusPill({ status }) {
  const colors = {
    PENDING: { bg: "#fff4e8", color: "#8a5a1f" },
    VERIFIED: { bg: "var(--mint)", color: "var(--teal)" },
    REJECTED: { bg: "#fbe4e0", color: "#c0392b" },
  };
  const c = colors[status] || colors.PENDING;
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: 999,
      }}
    >
      {status}
    </span>
  );
}

export default function TransferRequestsTable({ initialRequests }) {
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  async function handleVerify(id) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/transfer-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "VERIFIED" } : r)));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    const reason = window.prompt("Optional: reason for rejecting (shown internally only)") || "";
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/transfer-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "REJECTED" } : r)));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {error && <p className="admin-error">{error}</p>}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Submitted account details</th>
            <th>Amount claimed</th>
            <th>Submitted</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <td>
                {r.student_name}
                <br />
                <small style={{ color: "#8fa2a5" }}>{r.student_email}</small>
              </td>
              <td>
                {r.payer_name}
                <br />
                <small style={{ color: "#8fa2a5" }}>
                  {r.payer_account_number}
                  {r.payer_bank_name ? ` \u2014 ${r.payer_bank_name}` : ""}
                </small>
                {r.note && <div style={{ fontSize: 12, color: "#8fa2a5", marginTop: 4 }}>&ldquo;{r.note}&rdquo;</div>}
              </td>
              <td>{r.amount_minor ? (r.amount_minor / 100).toLocaleString() : "\u2014"}</td>
              <td>{new Date(r.created_at).toLocaleString()}</td>
              <td>
                <StatusPill status={r.status} />
              </td>
              <td>
                {r.status === "PENDING" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="admin-btn" style={{ padding: "4px 10px" }} disabled={busyId === r.id} onClick={() => handleVerify(r.id)}>
                      Verify
                    </button>
                    <button className="admin-btn danger" style={{ padding: "4px 10px" }} disabled={busyId === r.id} onClick={() => handleReject(r.id)}>
                      Reject
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {requests.length === 0 && (
            <tr>
              <td colSpan={6} style={{ color: "#8fa2a5" }}>
                No transfer requests yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
