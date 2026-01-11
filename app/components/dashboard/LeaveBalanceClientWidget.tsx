"use client";

import { Card } from "@/components/ui/Card";
import LeaveBalancePanel from "@/components/LeaveBalancePanel";
import AddLeaveRequestDialog from "@/components/AddLeaveRequestDialog";
import { useSession } from "next-auth/react";
import { isAdminOrManager as isAdminOrManagerHelper } from "@/lib/roles";

/**
 * NZ Holidays Act 2003 Compliance Data
 */
interface NZComplianceData {
  futureAnnualLeaveEntitlement: number | null;
  annualLeaveEntitlementDate: string | null;
  leaveInAdvanceUsed: number;
  isCasualEmployee: boolean;
}

interface LeaveBalanceClientWidgetProps {
  employeeId: string;
  leaveEntitlements: any[]; // adjust type if you have Entitlement type
  nzComplianceData?: NZComplianceData;
}

export default function LeaveBalanceClientWidget({
  employeeId,
  leaveEntitlements,
  nzComplianceData,
}: LeaveBalanceClientWidgetProps) {
  const { data: session } = useSession();
  const role = session?.user?.role ?? null;
  const isAdminOrManager =
    role === "ADMIN" || role === "MANAGER" || role === "SUPER_ADMIN";
  // Dashboard widget is always for the current user (self)
  const isBookingForSelf = true;
  
  return (
    <Card>
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Leave Balances & Booking</h2>
      </div>
      <div className="p-4 space-y-4">
        <LeaveBalancePanel
          employeeId={employeeId}
          leaveEntitlements={leaveEntitlements}
          isAdminOrManager={Boolean(isAdminOrManager)}
          isBookingForSelf={isBookingForSelf}
          nzComplianceData={nzComplianceData}
        />
        <AddLeaveRequestDialog
          employeeId={employeeId}
          isAdminOrManager={Boolean(isAdminOrManager)}
          isBookingForSelf={isBookingForSelf}
        />
      </div>
    </Card>
  );
}
