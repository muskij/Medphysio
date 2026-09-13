import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getSessionUser } from "../../lib/auth";
import { isSubscribed, getBankDetails, getLatestSubmissionForUser } from "../../lib/queries";
import { getSubscriptionPricing } from "../../lib/paystack";
import BankTransferForm from "./BankTransferForm";

const STATUS_LABEL = {
  PENDING: "Pending review",
  VERIFIED: "Verified",
  REJECTED: "Not approved",
};

export default async function SubscribePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/subscribe");

  const alreadySubscribed = isSubscribed(user.id);
  const { amountMinor, currency } = getSubscriptionPricing();
  const displayAmount = (amountMinor / 100).toLocaleString();
  const bank = getBankDetails();
  const submission = alreadySubscribed ? null : getLatestSubmissionForUser(user.id);
  const bankConfigured = !!(bank.accountNumber && bank.accountName);

  return (
    <main>
      <SiteHeader user={user} />
      <section className="join" style={{ maxWidth: 680 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <span className="kicker">One plan, everything included</span>
          <h2>{alreadySubscribed ? "You're subscribed" : "Subscribe to MedPhysio Tutorials"}</h2>

          {alreadySubscribed ? (
            <>
              <p>You have full access to every course on the site. Thanks for subscribing!</p>
              <Link className="button" href="/dashboard" style={{ width: "max-content" }}>
                Go to your dashboard &#8594;
              </Link>
            </>
          ) : (
            <>
              <p>
                One subscription unlocks every course, every lesson, quizzes and the AI study assistant &mdash; no
                per-course payments.
              </p>
              <ul style={{ margin: "18px 0", paddingLeft: 20, color: "#40595e", lineHeight: 1.9 }}>
                <li>Full access to all current and future courses</li>
                <li>Quizzes, progress tracking and structured-answer videos</li>
                <li>The lesson AI assistant, grounded in course content</li>
              </ul>
              <p style={{ fontSize: 28, fontWeight: 800, color: "var(--navy)", margin: "18px 0" }}>
                {currency} {displayAmount}
                <span style={{ fontSize: 14, fontWeight: 600, color: "#7c9195" }}> / month</span>
              </p>

              {!bankConfigured ? (
                <p style={{ color: "#c0392b", fontSize: 13 }}>
                  Payment isn&rsquo;t set up yet &mdash; please check back shortly, or contact us directly (see the
                  Contact section below).
                </p>
              ) : (
                <>
                  <div className="bank-details-card">
                    <span className="kicker" style={{ color: "#087772" }}>
                      Step 1 &middot; Make a bank transfer
                    </span>
                    <div className="bank-details-grid">
                      <div>
                        <small>Bank name</small>
                        <strong>{bank.bankName}</strong>
                      </div>
                      <div>
                        <small>Account name</small>
                        <strong>{bank.accountName}</strong>
                      </div>
                      <div>
                        <small>Account number</small>
                        <strong>{bank.accountNumber}</strong>
                      </div>
                      <div>
                        <small>Amount</small>
                        <strong>
                          {currency} {displayAmount}
                        </strong>
                      </div>
                    </div>
                    {bank.note && <p style={{ margin: "10px 0 0", fontSize: 12, color: "#40595e" }}>{bank.note}</p>}
                  </div>

                  {submission && submission.status !== "REJECTED" ? (
                    <div className="success-message" style={{ marginTop: 20 }}>
                      <span>{submission.status === "VERIFIED" ? "\u2713" : "\u23f3"}</span>
                      <div>
                        <strong>Status: {STATUS_LABEL[submission.status]}</strong>
                        <small>
                          {submission.status === "PENDING"
                            ? "We'll activate your subscription as soon as an admin confirms your transfer."
                            : "Your subscription should already be active — refresh the page."}
                        </small>
                      </div>
                    </div>
                  ) : (
                    <>
                      {submission && submission.status === "REJECTED" && (
                        <p style={{ color: "#c0392b", fontSize: 13, marginTop: 16 }}>
                          Your previous submission couldn&rsquo;t be verified
                          {submission.review_note ? `: ${submission.review_note}` : "."} Please double-check the
                          details and submit again.
                        </p>
                      )}
                      <div style={{ marginTop: 20 }}>
                        <span className="kicker" style={{ color: "#087772" }}>
                          Step 2 &middot; Confirm your payment
                        </span>
                        <div style={{ marginTop: 10 }}>
                          <BankTransferForm user={user} displayAmount={displayAmount} currency={currency} />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
