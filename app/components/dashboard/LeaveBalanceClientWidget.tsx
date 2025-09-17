"use client";

import { Card } from "@/components/ui/Card";
import LeaveBalancePanel from "@/components/LeaveBalancePanel";
import AddLeaveRequestDialog from "@/components/AddLeaveRequestDialog";
import { useSession } from "next-auth/react";

interface LeaveBalanceClientWidgetProps {
  employeeId: string;
  leaveEntitlements: any[]; // adjust type if you have Entitlement type
}

export default function LeaveBalanceClientWidget({
  employeeId,
  leaveEntitlements,
}: LeaveBalanceClientWidgetProps) {
  const { data: session } = useSession();
  const isAdminOrManager =
    session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";
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
        <AddLeaveRequestDialog
          employeeId={employeeId}
          isAdminOrManager={Boolean(isAdminOrManager)}
        />
      </div>
    </Card>
  );
}
