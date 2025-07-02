"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EditEntitlementModal from "@/components/EditEntitlementModal";
import type { LeaveEntitlement as PrismaEntitlement, EventCategory } from "@prisma/client";

interface LeaveEntitlement extends PrismaEntitlement {
  eventCategory: EventCategory;
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

  return (
    <div className="space-y-2 text-sm">
      {leaveEntitlements && leaveEntitlements.length > 0 ? (
        leaveEntitlements.map((entitlement) => (
          <p key={entitlement.id}>
            <strong>{entitlement.eventCategory.name}:</strong>{" "}
            {entitlement.totalDays - entitlement.usedDays} days remaining
          </p>
        ))
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
        currentEntitlements={leaveEntitlements}
        refresh={() => window.location.reload()}
      />
    </div>
  );
}
