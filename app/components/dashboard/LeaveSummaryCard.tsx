"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { CalendarCheck2 } from "lucide-react";
import AddLeaveRequestDialog from "@/components/AddLeaveRequestDialog";

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

export default function LeaveSummaryCard({ employeeId }: { employeeId: string }) {
  const [entitlements, setEntitlements] = useState<LeaveEntitlement[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchEntitlements = async () => {
      try {
        const res = await fetch(`/api/employees/${employeeId}/entitlement`);
        if (res.ok) {
          const data = await res.json();
          setEntitlements(data);
        } else {
          console.error("Failed to fetch entitlements.");
        }
      } catch (error) {
        console.error("Error fetching entitlements:", error);
      }
    };
    fetchEntitlements();
  }, [employeeId]);

  const totalAllowance = entitlements.reduce((acc, e) => acc + e.totalDays, 0);
  const totalTaken = entitlements.reduce((acc, e) => acc + e.usedDays, 0);
  const totalRemaining = totalAllowance - totalTaken;

  return (
    <Card>
      <div className="border-b p-4 flex items-center gap-2">
        <CalendarCheck2 className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-semibold">Holiday Balance</h2>
      </div>
      <div className="p-4 space-y-2 text-sm">
        <p>Total Allowance: <strong>{totalAllowance} days</strong></p>
        <p>Taken: <strong>{totalTaken} days</strong></p>
        <p>Remaining: <strong>{totalRemaining} days</strong></p>

        <Button className="mt-2 w-full" onClick={() => setModalOpen(true)}>
          Book Holiday
        </Button>

        <AddLeaveRequestDialog
          employeeId={employeeId}
          isAdminOrManager={true}
          open={modalOpen}
          setOpen={setModalOpen}
        />
      </div>
    </Card>
  );
}
