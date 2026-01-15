"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { CalendarCheck2 } from "lucide-react";
import AddLeaveRequestDialog from "@/components/AddLeaveRequestDialog";
import { useSession } from "next-auth/react";
import { isAdminOrManager as isAdminOrManagerHelper } from "@/lib/roles";
import { formatLeaveBalance, subtractWithPrecision } from "@/lib/decimalPrecision";

type LeaveEntitlement = {
  id: string;
  totalDays: number;
  usedDays: number;
  eventCategory: {
    id: string;
    name: string;
    color: string | null;
  };
};

import { useApi } from "@/hooks/useApi";

export default function LeaveSummaryCard({
  employeeId,
}: {
  employeeId: string;
}) {
  const { data: session } = useSession();
  const { data: entitlementsData } = useApi<LeaveEntitlement[]>(`/api/employees/${employeeId}/entitlement`);
  const entitlements = entitlementsData || [];

  const [modalOpen, setModalOpen] = useState(false);
  const isAdminOrManager = isAdminOrManagerHelper(session);

  const totalAllowance = formatLeaveBalance(entitlements.reduce((acc, e) => acc + e.totalDays, 0));
  const totalTaken = formatLeaveBalance(entitlements.reduce((acc, e) => acc + e.usedDays, 0));
  const totalRemaining = formatLeaveBalance(subtractWithPrecision(totalAllowance, totalTaken));

  return (
    <Card>
      <div className="border-b p-4 flex items-center gap-2">
        <CalendarCheck2 className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-semibold">Leave Balance</h2>
      </div>
      <div className="p-4 flex flex-col text-sm">
        <div className="space-y-2">
          <p>
            Total Allowance: <strong>{totalAllowance} days</strong>
          </p>
          <p>
            Taken: <strong>{totalTaken} days</strong>
          </p>
          <p>
            Remaining: <strong>{totalRemaining} days</strong>
          </p>
        </div>

        <div className="flex-1 flex items-end pt-6">
          <Button className="w-full" onClick={() => setModalOpen(true)}>
            Book Leave
          </Button>
        </div>

        <AddLeaveRequestDialog
          employeeId={employeeId}
          isAdminOrManager={Boolean(isAdminOrManager)}
          isBookingForSelf={true}
          open={modalOpen}
          setOpen={setModalOpen}
        />
      </div>
    </Card>
  );
}
