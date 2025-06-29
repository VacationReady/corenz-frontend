"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EditEntitlementModal from "@/components/EditEntitlementModal";

interface LeaveEntitlement {
  id: string;
  annualLeave: number;
  sickLeave: number;
  bereavement: number;
}

interface LeaveBalancePanelProps {
  leaveEntitlements: LeaveEntitlement[];
  employeeId: string;
}

export default function LeaveBalancePanel({
  leaveEntitlements,
  employeeId,
}: LeaveBalancePanelProps) {
  const [modalOpen, setModalOpen] = useState(false);

  // Assuming the latest entitlement is the relevant one; adjust if needed
  const currentEntitlement = leaveEntitlements?.[0];

  return (
    <div className="space-y-2 text-sm">
      {currentEntitlement ? (
        <>
          <p>
            <strong>Annual Leave:</strong> {currentEntitlement.annualLeave} days
          </p>
          <p>
            <strong>Sick Leave:</strong> {currentEntitlement.sickLeave} days
          </p>
          <p>
            <strong>Bereavement Leave:</strong> {currentEntitlement.bereavement} days
          </p>
        </>
      ) : (
        <p>No entitlement data found.</p>
      )}

      <Button size="sm" onClick={() => setModalOpen(true)}>
        Edit Entitlements
      </Button>

      <EditEntitlementModal
        open={modalOpen}
        setOpen={setModalOpen}
        employeeId={employeeId}
        currentEntitlement={currentEntitlement}
        refresh={() => window.location.reload()} // You can refine with SWR mutation or router.refresh() if using App Router
      />
    </div>
  );
}
