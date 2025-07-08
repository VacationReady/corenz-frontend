import { prisma } from "@/lib/prisma";
import LeaveBalanceClientWidget from "./LeaveBalanceClientWidget";

interface LeaveBalanceWidgetProps {
  employeeId: string;
}

export default async function LeaveBalanceWidget({ employeeId }: LeaveBalanceWidgetProps) {
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
      leaveEntitlements={employee.leaveEntitlements}
    />
  );
}
