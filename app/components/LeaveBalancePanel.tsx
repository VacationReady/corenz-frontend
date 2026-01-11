"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import EditEntitlementModal from "@/components/EditEntitlementModal";
import AddLeaveRequestDialog from "@/components/AddLeaveRequestDialog";
import type {
  LeaveEntitlement as PrismaEntitlement,
  EventCategory,
} from "@prisma/client";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, AlertCircle } from "lucide-react";
import { roundToTwoDecimals, subtractWithPrecision } from "@/lib/decimalPrecision";

interface LeaveEntitlement extends PrismaEntitlement {
  eventCategory: EventCategory;
}

/**
 * NZ Holidays Act 2003 Compliance Data
 * 
 * These fields track annual leave for employees who have not yet reached
 * their 12-month employment anniversary. Under NZ law, employees are not
 * entitled to annual leave until they complete 12 months of continuous employment.
 */
interface NZComplianceData {
  /** Future annual leave entitlement (days) - granted at 12-month anniversary */
  futureAnnualLeaveEntitlement: number | null;
  /** Date when annual leave entitlement crystallises (12 months from start) */
  annualLeaveEntitlementDate: Date | string | null;
  /** Leave in advance taken before 12-month anniversary (days) */
  leaveInAdvanceUsed: number;
  /** Whether employee is casual (receives 8% holiday pay instead) */
  isCasualEmployee: boolean;
}

interface LeaveBalancePanelProps {
  leaveEntitlements: LeaveEntitlement[];
  employeeId: string;
  isAdminOrManager?: boolean;
  /** Whether the current user is booking leave for themselves */
  isBookingForSelf?: boolean;
  eventCategoryNameAllowList?: string[];
  /** NZ Holidays Act 2003 compliance data for pre-12-month employees */
  nzComplianceData?: NZComplianceData;
}

import { useTenantFetch } from "@/hooks/useTenantFetch";

/**
 * Determines if an employee is pre-12-month based on NZ compliance data.
 * Pre-12-month employees have not yet reached their entitlement crystallisation date.
 */
function isPreTwelveMonthEmployee(
  nzComplianceData: NZComplianceData | undefined,
  hasAnnualLeaveEntitlement: boolean
): boolean {
  // If no NZ compliance data provided, assume post-12-month (existing behavior)
  if (!nzComplianceData) return false;
  
  // Casual employees don't accrue annual leave
  if (nzComplianceData.isCasualEmployee) return false;
  
  // If they have an active LeaveEntitlement for Annual Leave, they're post-12-month
  if (hasAnnualLeaveEntitlement) return false;
  
  // If they have a future entitlement stored, they're pre-12-month
  if (nzComplianceData.futureAnnualLeaveEntitlement !== null && 
      nzComplianceData.futureAnnualLeaveEntitlement > 0) {
    return true;
  }
  
  // If their entitlement date is in the future, they're pre-12-month
  if (nzComplianceData.annualLeaveEntitlementDate) {
    const entitlementDate = new Date(nzComplianceData.annualLeaveEntitlementDate);
    return entitlementDate > new Date();
  }
  
  return false;
}

/**
 * Formats a date for display
 */
function formatEntitlementDate(date: Date | string | null): string {
  if (!date) return "Not set";
  const d = new Date(date);
  return d.toLocaleDateString("en-NZ", { 
    day: "numeric", 
    month: "short", 
    year: "numeric" 
  });
}

export default function LeaveBalancePanel({
  leaveEntitlements,
  employeeId,
  isAdminOrManager = false,
  isBookingForSelf = true,
  eventCategoryNameAllowList,
  nzComplianceData,
}: LeaveBalancePanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const normalizedAllowList = (eventCategoryNameAllowList ?? []).map((name) =>
    name.trim().toLowerCase(),
  );
  const filterEntitlements = (items: LeaveEntitlement[]) => {
    if (!normalizedAllowList.length) return items;
    return items.filter((entitlement) =>
      normalizedAllowList.includes(
        (entitlement.eventCategory?.name ?? "").trim().toLowerCase(),
      ),
    );
  };

  const [entitlements, setEntitlements] = useState(() =>
    filterEntitlements(leaveEntitlements),
  );
  const tenantFetch = useTenantFetch();

  const refreshEntitlements = async () => {
    try {
      const res = await tenantFetch(`/api/employees/${employeeId}/entitlement`);
      if (res.ok) {
        const data = await res.json();
        setEntitlements(filterEntitlements(data));
      } else {
        console.error("Failed to refresh entitlements.");
      }
    } catch (error) {
      console.error("Error refreshing entitlements:", error);
    }
  };

  // Check if employee has an Annual Leave entitlement record
  const hasAnnualLeaveEntitlement = entitlements.some(
    (e) => e.eventCategory?.name?.toLowerCase() === "annual leave"
  );

  // Determine if this is a pre-12-month employee (NZ Holidays Act 2003)
  const isPreTwelveMonth = isPreTwelveMonthEmployee(nzComplianceData, hasAnnualLeaveEntitlement);

  // Check if employee is casual (receives 8% holiday pay instead of annual leave)
  const isCasual = nzComplianceData?.isCasualEmployee ?? false;

  // NZ compliance display values
  const futureEntitlement = nzComplianceData?.futureAnnualLeaveEntitlement 
    ? roundToTwoDecimals(nzComplianceData.futureAnnualLeaveEntitlement) 
    : null;
  const leaveInAdvanceUsed = nzComplianceData?.leaveInAdvanceUsed 
    ? roundToTwoDecimals(nzComplianceData.leaveInAdvanceUsed) 
    : 0;
  const entitlementDate = nzComplianceData?.annualLeaveEntitlementDate 
    ? formatEntitlementDate(nzComplianceData.annualLeaveEntitlementDate) 
    : null;

  return (
    <TooltipProvider>
      <div className="space-y-4 text-sm">
        {/* NZ Holidays Act 2003: Pre-12-month employee display */}
        {isPreTwelveMonth && futureEntitlement !== null && (
          <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="font-medium text-amber-800 dark:text-amber-200">
                Annual Leave (Accrued - not yet entitled)
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Under the NZ Holidays Act 2003, employees are not entitled to annual leave 
                    until they complete 12 months of continuous employment. This balance shows 
                    leave that is accruing but not yet a legal entitlement.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="space-y-1 text-sm">
              <p className="flex items-center gap-1">
                <span className="text-muted-foreground">Future Entitlement:</span>
                <span className="font-medium">{futureEntitlement} days</span>
              </p>
              
              {leaveInAdvanceUsed > 0 && (
                <p className="flex items-center gap-1">
                  <span className="text-muted-foreground">Leave in Advance Used:</span>
                  <span className="font-medium text-amber-700 dark:text-amber-300">
                    {leaveInAdvanceUsed} days
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Leave taken before completing 12 months of employment. This will be 
                        deducted from your entitlement when it crystallises at your anniversary.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </p>
              )}
              
              {entitlementDate && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>Entitlement date:</span>
                  <span>{entitlementDate}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Casual employee notice */}
        {isCasual && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-800 dark:text-blue-200">
                Casual employees receive 8% holiday pay instead of annual leave accrual.
              </span>
            </div>
          </div>
        )}

        {/* Standard entitlement display (post-12-month employees) */}
        <div className="space-y-2">
          {entitlements && entitlements.length > 0 ? (
            entitlements.map((entitlement) => {
              // Round to 2 decimal places for display (NZ HRIS requirement)
              const remainingDays = roundToTwoDecimals(subtractWithPrecision(entitlement.totalDays, entitlement.usedDays));
              const carryoverDays = roundToTwoDecimals(entitlement.carryoverDays ?? 0);
              const standardEntitlement = roundToTwoDecimals(subtractWithPrecision(entitlement.totalDays, carryoverDays));
              const usedDays = roundToTwoDecimals(entitlement.usedDays);

              // Determine label based on entitlement type
              const isAnnualLeave = entitlement.eventCategory?.name?.toLowerCase() === "annual leave";
              const label = isAnnualLeave && !isPreTwelveMonth 
                ? "Annual Leave Entitlement" 
                : entitlement.eventCategory.name;

              return (
                <p key={entitlement.id} className="flex items-center gap-1">
                  <strong>{label}:</strong> {remainingDays}{" "}
                  days remaining
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
                    </HoverCardTrigger>
                    <HoverCardContent className="text-xs">
                      <div>Standard Entitlement: {standardEntitlement} days</div>
                      <div>Carryover: {carryoverDays} days</div>
                      <div>Used: {usedDays} days</div>
                      <div>Remaining: {remainingDays} days</div>
                    </HoverCardContent>
                  </HoverCard>
                </p>
              );
            })
          ) : !isPreTwelveMonth && !isCasual ? (
            <p>No entitlement data found.</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <AddLeaveRequestDialog
            employeeId={employeeId}
            isAdminOrManager={isAdminOrManager}
            isBookingForSelf={isBookingForSelf}
          />
          {isAdminOrManager && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalOpen(true)}
            >
              Edit Entitlements
            </Button>
          )}
        </div>

        {isAdminOrManager && (
          <EditEntitlementModal
            open={modalOpen}
            setOpen={setModalOpen}
            employeeId={employeeId}
            currentEntitlements={entitlements}
            refresh={refreshEntitlements}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
