import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getSessionUser } from "../../lib/auth";
import { isSubscribed } from "../../lib/queries";
import { getSubscriptionPricing } from "../../lib/paystack";
import SubscribeButton from "./SubscribeButton";

export default async function SubscribePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/subscribe");

  const alreadySubscribed = isSubscribed(user.id);
  const { amountMinor, currency } = getSubscriptionPricing();
  const displayAmount = (amountMinor / 100).toLocaleString();

  return (
    <main>
      <SiteHeader user={user} />
      <section className="join" style={{ maxWidth: 560 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <span className="kicker">One plan, everything included</span>
          <h2>
            {alreadySubscribed ? "You're subscribed" : "Subscribe to MedPhysio Tutorials"}
          </h2>
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
              <SubscribeButton />
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
