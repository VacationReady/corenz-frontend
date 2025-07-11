import { prisma } from "@/lib/prisma";
import LeaveBalanceClientWidget from "./LeaveBalanceClientWidget";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { CalendarCheck2 } from "lucide-react";

interface LeaveBalanceWidgetProps {
  employeeId: string;
  titleOnly?: boolean;
}

export default async function LeaveBalanceWidget({
  employeeId,
  titleOnly = false,
}: LeaveBalanceWidgetProps) {
  // Render a compact 'Book Leave' card in the header if requested
  if (titleOnly) {
    return (
      <DashboardWidget title="Book Leave" icon={CalendarCheck2} className="h-full">
        <p className="p-4 text-center">Quick access to book your leave</p>
      </DashboardWidget>
    );
  }

  // Otherwise, fetch and display full leave entitlements
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { leaveEntitlements: { include: { eventCategory: true } } },
  });

  if (!employee) {
    return <div className="p-4">Employee not found for leave balances.</div>;
  }

  return (
  <LeaveBalanceClientWidget
    employeeId={employee.id}
    leaveEntitlements={employee.leaveEntitlements.map(entitlement => ({
      id: entitlement.id,
      remaining: entitlement.remaining,
      taken: entitlement.taken,
      total: entitlement.total,
      eventCategory: {
        id: entitlement.eventCategory.id,
        name: entitlement.eventCategory.name,
        color: entitlement.eventCategory.color,
      },
    }))}
  />
);
