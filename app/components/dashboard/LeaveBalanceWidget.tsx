"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import LeaveBalancePanel from "@/components/LeaveBalancePanel";
import AddLeaveRequestDialog from "@/components/AddLeaveRequestDialog";

interface LeaveBalanceWidgetProps {
  employeeId: string;
}

export default function LeaveBalanceWidget({ employeeId }: LeaveBalanceWidgetProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null; // avoid hydration mismatch

  return (
    <Card>
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Leave Balances & Booking</h2>
      </div>
      <div className="p-4 space-y-4">
        <LeaveBalancePanel employeeId={employeeId} />
        <AddLeaveRequestDialog employeeId={employeeId} isAdminOrManager={true} />
      </div>
    </Card>
  );
}
