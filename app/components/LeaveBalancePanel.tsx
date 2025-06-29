"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EditEntitlementModal from "@/components/EditEntitlementModal";

interface LeaveEntitlement {
  id: string;
  annual: number;
  sick: number;
  bereavement: number;
}

interface LeaveBalancePanelProps {
  leaveEntitlement: LeaveEntitlement | null;
  employeeId: string;
}

export default function LeaveBalancePanel({
  leaveEntitlement,
  employeeId,
}: LeaveBalancePanelProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const currentEntitlement = leaveEntitlement;

  return (
    <div className="space-y-2 text-sm">
      {currentEntitlement ? (
        <>
          <p>
            <strong>Annual Leave:</strong> {currentEntitlement.annual} days
          </p>
          <p>
            <strong>Sick Leave:</strong> {currentEntitlement.sick} days
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
        refresh={() => window.location.reload()}
      />
    </div>
  );
}
