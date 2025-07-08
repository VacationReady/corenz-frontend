"use client";

import { Card } from "@/components/ui/Card";
import LeaveBalancePanel from "@/components/LeaveBalancePanel";
import AddLeaveRequestDialog from "@/components/AddLeaveRequestDialog";

export default function LeaveBalanceClientWidget({ employeeId, leaveEntitlements }) {
  return (
    <Card>
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Leave Balances & Booking</h2>
      </div>
      <div className="p-4 space-y-4">
        <LeaveBalancePanel
          employeeId={employeeId}
          leaveEntitlements={leaveEntitlements}
        />
        <AddLeaveRequestDialog employeeId={employeeId} isAdminOrManager={true} />
      </div>
    </Card>
  );
}
