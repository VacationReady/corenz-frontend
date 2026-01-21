import { prisma } from "@/lib/prisma";
import LeaveBalanceClientWidget from "./LeaveBalanceClientWidget";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { CalendarCheck2 } from "lucide-react";
import { formatLeaveBalance } from "@/lib/decimalPrecision";

interface LeaveBalanceWidgetProps {
  employeeId: string;
  titleOnly?: boolean;
}

export default async function LeaveBalanceWidget({
  employeeId,
  titleOnly = false,
}: LeaveBalanceWidgetProps) {
  if (titleOnly) {
    return (
      <DashboardWidget
        title="Book Leave"
        icon={CalendarCheck2}
        className="h-full"
      >
        <p className="p-4 text-center">Quick access to book your leave</p>
      </DashboardWidget>
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { 
      LeaveEntitlement: { include: { EventCategory: true } },
      Company: true,
    },
  });

  if (!employee) {
    return <div className="p-4">Employee not found for leave balances.</div>;
  }

  // Check if hours-based tracking is enabled for this company
  // Default to true (hours enabled) when not explicitly set to false
  const companyWithConfig = employee.Company as any;
  const showHours = companyWithConfig?.leaveHoursEnabled !== false;
  
  // Get company default hours per day (default 8 for NZ standard)
  const defaultHoursPerDay = companyWithConfig?.defaultHoursPerDay 
    ? Number(companyWithConfig.defaultHoursPerDay) 
    : 8;

  // Fully serialize leaveEntitlements precisely for LeaveBalancePanel
  const serializedEntitlements = employee.LeaveEntitlement.map(
    (entitlement) => {
      // Type assertion for hours fields that may not exist in Prisma types yet
      const entWithHours = entitlement as typeof entitlement & {
        totalHours?: any;
        usedHours?: any;
        carryoverHours?: any;
      };
      
      const totalDays = formatLeaveBalance(entitlement.totalDays);
      const usedDays = formatLeaveBalance(entitlement.usedDays);
      const carryoverDays = formatLeaveBalance(entitlement.carryoverDays ?? 0);
      
      // Calculate hours - use stored values if available, otherwise derive from days
      const totalHours = entWithHours.totalHours 
        ? Number(entWithHours.totalHours) 
        : (showHours ? totalDays * defaultHoursPerDay : null);
      const usedHours = entWithHours.usedHours 
        ? Number(entWithHours.usedHours) 
        : (showHours ? usedDays * defaultHoursPerDay : null);
      const carryoverHours = entWithHours.carryoverHours 
        ? Number(entWithHours.carryoverHours) 
        : (showHours ? carryoverDays * defaultHoursPerDay : null);
      
      return {
        id: entitlement.id,
        totalDays,
        usedDays,
        carryoverDays,
        // Include calculated hours data when showHours is enabled
        totalHours,
        usedHours,
        carryoverHours,
        eventCategory: {
          id: entitlement.EventCategory.id,
          name: entitlement.EventCategory.name,
          color: entitlement.EventCategory.color ?? null,
        },
      };
    },
  );

  // Prepare NZ Holidays Act 2003 compliance data
  const nzComplianceData = {
    futureAnnualLeaveEntitlement: employee.futureAnnualLeaveEntitlement 
      ? Number(employee.futureAnnualLeaveEntitlement) 
      : null,
    annualLeaveEntitlementDate: employee.annualLeaveEntitlementDate 
      ? employee.annualLeaveEntitlementDate.toISOString() 
      : null,
    leaveInAdvanceUsed: Number(employee.leaveInAdvanceUsed ?? 0),
    isCasualEmployee: employee.isCasualEmployee ?? false,
  };

  return (
    <LeaveBalanceClientWidget
      employeeId={employee.id}
      leaveEntitlements={serializedEntitlements}
      nzComplianceData={nzComplianceData}
      showHours={showHours}
    />
  );
}
