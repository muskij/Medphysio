"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function VerifyingContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [error, setError] = useState("");

  useEffect(() => {
    const reference = params.get("reference") || params.get("trxref");
    if (!reference) {
      setStatus("error");
      setError("No payment reference was found in the URL.");
      return;
    }
    fetch("/api/paystack/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Verification failed.");
        setStatus("success");
        router.refresh();
      })
      .catch((err) => {
        setStatus("error");
        setError(err.message);
      });
  }, [params, router]);

  return (
    <section className="join" style={{ maxWidth: 520 }}>
      <div style={{ gridColumn: "1 / -1", textAlign: "center" }}>
        {status === "verifying" && <h2>Confirming your payment&hellip;</h2>}
        {status === "success" && (
          <>
            <h2>You&rsquo;re subscribed! &#127881;</h2>
            <p>Your payment was confirmed and your account now has full access.</p>
            <Link className="button" href="/dashboard" style={{ width: "max-content", margin: "18px auto 0" }}>
              Go to your dashboard &#8594;
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <h2>We couldn&rsquo;t confirm that payment</h2>
            <p style={{ color: "#c0392b" }}>{error}</p>
            <p>
              If you were charged, this usually resolves automatically within a minute &mdash; try refreshing your{" "}
              <Link href="/dashboard" style={{ color: "var(--teal)", fontWeight: 700 }}>
                dashboard
              </Link>{" "}
              shortly.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export default function SubscribeSuccessPage() {
  return (
    <main>
      <Suspense fallback={<p style={{ textAlign: "center", padding: 60 }}>Loading&hellip;</p>}>
        <VerifyingContent />
      </Suspense>
    </main>
  );
}
