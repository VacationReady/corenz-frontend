"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EditEntitlementModal from "@/components/EditEntitlementModal";
import type { LeaveEntitlement as PrismaEntitlement, EventCategory } from "@prisma/client";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Info } from "lucide-react";

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
  const [entitlements, setEntitlements] = useState(leaveEntitlements);

  const refreshEntitlements = async () => {
    try {
      const res = await fetch(`/api/employees/${employeeId}/entitlement`);
      if (res.ok) {
        const data = await res.json();
        setEntitlements(data);
      } else {
        console.error("Failed to refresh entitlements.");
      }
    } catch (error) {
      console.error("Error refreshing entitlements:", error);
    }
  };

  return (
    <div className="space-y-2 text-sm">
      {entitlements && entitlements.length > 0 ? (
        entitlements.map((entitlement) => {
          const remainingDays = entitlement.totalDays - entitlement.usedDays;
          const carryoverDays = entitlement.carryoverDays ?? 0;
          const standardEntitlement = entitlement.totalDays - carryoverDays;

          return (
            <p key={entitlement.id} className="flex items-center gap-1">
              <strong>{entitlement.eventCategory.name}:</strong>{" "}
              {remainingDays} days remaining
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
                </HoverCardTrigger>
                <HoverCardContent className="text-xs">
                  <div>Standard Entitlement: {standardEntitlement} days</div>
                  <div>Carryover: {carryoverDays} days</div>
                  <div>Used: {entitlement.usedDays} days</div>
                  <div>Remaining: {remainingDays} days</div>
                </HoverCardContent>
              </HoverCard>
            </p>
          );
        })
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
        currentEntitlements={entitlements}
        refresh={refreshEntitlements}
      />
    </div>
  );
}
