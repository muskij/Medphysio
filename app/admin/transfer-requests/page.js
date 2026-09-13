import { redirect } from "next/navigation";
import { getSessionUser } from "../../../lib/auth";
import { listTransferRequests } from "../../../lib/queries";
import TransferRequestsTable from "./TransferRequestsTable";

export default async function TransferRequestsPage() {
  const user = await getSessionUser();
  if (user.role !== "ADMIN") redirect("/admin");

  const requests = listTransferRequests();
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>Bank transfer requests</h1>
          <p>
            {pendingCount > 0
              ? `${pendingCount} request${pendingCount === 1 ? "" : "s"} waiting for verification.`
              : "No pending requests right now."}
          </p>
        </div>
      </div>

      <div className="admin-card">
        <TransferRequestsTable initialRequests={requests} />
      </div>
    </>
  );
}
