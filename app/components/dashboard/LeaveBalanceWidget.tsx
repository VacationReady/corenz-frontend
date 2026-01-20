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
  const companyWithConfig = employee.Company as any;
  const showHours = companyWithConfig?.leaveHoursEnabled === true;

  // Fully serialize leaveEntitlements precisely for LeaveBalancePanel
  const serializedEntitlements = employee.LeaveEntitlement.map(
    (entitlement) => ({
      id: entitlement.id,
      totalDays: formatLeaveBalance(entitlement.totalDays),
      usedDays: formatLeaveBalance(entitlement.usedDays),
      carryoverDays: formatLeaveBalance(entitlement.carryoverDays ?? 0),
      eventCategory: {
        id: entitlement.EventCategory.id,
        name: entitlement.EventCategory.name,
        color: entitlement.EventCategory.color ?? null,
      },
    }),
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
