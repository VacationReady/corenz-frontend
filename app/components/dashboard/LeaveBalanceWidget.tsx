// app/components/dashboard/LeaveBalanceWidget.tsx

import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import LeaveBalancePanel from "@/components/LeaveBalancePanel";
import AddLeaveRequestDialog from "@/components/AddLeaveRequestDialog";

interface LeaveBalanceWidgetProps {
  employeeId: string;
}

export default async function LeaveBalanceWidget({ employeeId }: LeaveBalanceWidgetProps) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      leaveEntitlements: { include: { eventCategory: true } },
    },
  });

  if (!employee) {
    return <div className="p-4">Employee record not found for leave balances.</div>;
  }

  return (
    <Card>
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Leave Balances & Booking</h2>
      </div>
      <div className="p-4 space-y-4">
        <LeaveBalancePanel
          employeeId={employee.id}
          leaveEntitlements={employee.leaveEntitlements}
        />
        <AddLeaveRequestDialog employeeId={employee.id} isAdminOrManager={true} />
      </div>
    </Card>
  );
}
