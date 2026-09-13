import { redirect } from "next/navigation";
import { getSessionUser } from "../../../lib/auth";
import { getBankDetails } from "../../../lib/settings";
import { getSubscriptionPricing } from "../../../lib/pricing";
import PaymentSettingsForm from "./PaymentSettingsForm";

export default async function PaymentSettingsPage() {
  const user = await getSessionUser();
  if (user.role !== "ADMIN") redirect("/admin");

  const bankDetails = getBankDetails();
  const { amountMinor, currency } = getSubscriptionPricing();

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>Payment settings</h1>
          <p>The bank account students are shown when they subscribe by direct transfer.</p>
        </div>
      </div>

      <div className="admin-card" style={{ maxWidth: 520 }}>
        <p style={{ fontSize: 13, color: "#7c9195", marginTop: 0 }}>
          Current subscription price: <strong>{currency} {(amountMinor / 100).toLocaleString()}</strong> (set via the{" "}
          <code>SUBSCRIPTION_PRICE_MINOR</code> environment variable).
        </p>
        <PaymentSettingsForm initial={bankDetails} />
      </div>
    </>
  );
}
