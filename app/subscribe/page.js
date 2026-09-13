import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getSessionUser } from "../../lib/auth";
import { isSubscribed, getLatestTransferRequest } from "../../lib/queries";
import { getSubscriptionPricing } from "../../lib/pricing";
import { getBankDetails, bankDetailsConfigured } from "../../lib/settings";
import TransferRequestForm from "./TransferRequestForm";

const RECEIPT_WHATSAPP_NUMBER = "08032429067";

export default async function SubscribePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/subscribe");

  const alreadySubscribed = isSubscribed(user.id);
  const { amountMinor, currency } = getSubscriptionPricing();
  const displayAmount = (amountMinor / 100).toLocaleString();
  const bankDetails = getBankDetails();
  const bankConfigured = bankDetailsConfigured();
  const latestRequest = alreadySubscribed ? null : getLatestTransferRequest(user.id);
  const showForm = !alreadySubscribed && (!latestRequest || latestRequest.status === "REJECTED");

  return (
    <main>
      <SiteHeader user={user} subscribed={alreadySubscribed} />
      <section className="join" style={{ maxWidth: 620 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <span className="kicker">One plan, everything included</span>
          <h2>{alreadySubscribed ? "You're subscribed" : "Subscribe to MedPhysio Tutorials"}</h2>

          {alreadySubscribed && (
            <>
              <p>You have full access to every course on the site. Thanks for subscribing!</p>
              <Link className="button" href="/dashboard" style={{ width: "max-content" }}>
                Go to your dashboard &#8594;
              </Link>
            </>
          )}

          {!alreadySubscribed && (
            <>
              <p>
                One subscription unlocks every course, every lesson, quizzes and the AI study assistant &mdash; paid
                by direct bank transfer.
              </p>
              <p style={{ fontSize: 28, fontWeight: 800, color: "var(--navy)", margin: "18px 0" }}>
                {currency} {displayAmount}
                <span style={{ fontSize: 14, fontWeight: 600, color: "#7c9195" }}> / month</span>
              </p>
            </>
          )}

          {!alreadySubscribed && latestRequest && latestRequest.status === "PENDING" && (
            <div
              style={{
                background: "#fff4e8",
                color: "#8a5a1f",
                borderRadius: 12,
                padding: "16px 18px",
                marginTop: 10,
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              <strong>Your payment is being verified.</strong>
              <p style={{ margin: "6px 0 0" }}>
                We received your transfer details submitted on {new Date(latestRequest.created_at).toLocaleDateString()}.
                Access unlocks automatically as soon as an admin confirms the transfer &mdash; usually within a few
                hours. Haven&rsquo;t sent your receipt yet?
              </p>
              <a
                href={buildReceiptWhatsAppLink(user, latestRequest)}
                target="_blank"
                rel="noreferrer"
                className="button small"
                style={{ marginTop: 12, display: "inline-flex" }}
              >
                Send receipt on WhatsApp &#8594;
              </a>
            </div>
          )}

          {!alreadySubscribed && latestRequest && latestRequest.status === "REJECTED" && (
            <div
              style={{
                background: "#fbe4e0",
                color: "#c0392b",
                borderRadius: 12,
                padding: "16px 18px",
                marginTop: 10,
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              <strong>We couldn&rsquo;t verify your last submission.</strong>
              {latestRequest.rejection_reason && <p style={{ margin: "6px 0 0" }}>{latestRequest.rejection_reason}</p>}
              <p style={{ margin: "6px 0 0" }}>Please double-check your details and submit again below.</p>
            </div>
          )}

          {!alreadySubscribed && !bankConfigured && (
            <p style={{ color: "#7c9195", marginTop: 14 }}>
              Bank transfer isn&rsquo;t set up yet &mdash; please check back shortly.
            </p>
          )}

          {!alreadySubscribed && bankConfigured && (
            <div
              style={{
                background: "var(--mint)",
                borderRadius: 12,
                padding: "16px 18px",
                marginTop: 14,
                fontSize: 14,
                lineHeight: 1.9,
              }}
            >
              <strong style={{ color: "var(--navy)" }}>Transfer to:</strong>
              <div>
                Bank: <strong>{bankDetails.bankName}</strong>
              </div>
              <div>
                Account name: <strong>{bankDetails.accountName}</strong>
              </div>
              <div>
                Account number: <strong>{bankDetails.accountNumber}</strong>
              </div>
              {bankDetails.instructions && (
                <div style={{ marginTop: 8, color: "#40595e" }}>{bankDetails.instructions}</div>
              )}
            </div>
          )}

          {showForm && bankConfigured && (
            <TransferRequestForm receiptWhatsAppNumber={RECEIPT_WHATSAPP_NUMBER} amountMinor={amountMinor} currency={currency} />
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function buildReceiptWhatsAppLink(user, request) {
  const digits = RECEIPT_WHATSAPP_NUMBER.replace(/[^0-9]/g, "");
  const intlPhone = digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
  const message = `Hi, I just submitted a bank transfer for my MedPhysio Tutorials subscription.\nName: ${user.name}\nEmail: ${user.email}\nAccount used: ${request.payer_name} (${request.payer_account_number})\nI'm attaching my receipt.`;
  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;
}
