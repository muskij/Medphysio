import { redirect } from "next/navigation";
import { getSessionUser } from "../../../lib/auth";
import { getBankDetails, listPaymentSubmissions } from "../../../lib/queries";
import BankDetailsForm from "./BankDetailsForm";
import PaymentsTable from "./PaymentsTable";

export default async function AdminPaymentsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/admin");

  const bank = getBankDetails();
  const pending = listPaymentSubmissions("PENDING");
  const reviewed = [...listPaymentSubmissions("VERIFIED"), ...listPaymentSubmissions("REJECTED")].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>Payments</h1>
          <p>Set the bank account students transfer to, then verify their payment declarations here.</p>
        </div>
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Bank account details</h3>
        <p style={{ color: "#7c9195", fontSize: 13, marginTop: -6 }}>
          Shown to students on the Subscribe page so they know where to send their transfer.
        </p>
        <BankDetailsForm bank={bank} />
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Awaiting verification ({pending.length})</h3>
        <PaymentsTable submissions={pending} />
      </div>

      <div className="admin-card">
        <h3 style={{ marginTop: 0 }}>Reviewed</h3>
        <PaymentsTable submissions={reviewed} />
      </div>
    </>
  );
}
