// app/employees/[id]/overview/page.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LeaveCalendar from "@/components/LeaveCalendar";
import PersonalInfoPanel from "@/components/PersonalInfoPanel";
import LeaveBalancePanel from "@/components/LeaveBalancePanel";
import AddLeaveRequestDialog from "@/components/AddLeaveRequestDialog";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: { id: string };
}

export default async function EmployeeOverviewPage({ params }: PageProps) {
  const employeeId = params.id;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      leaveEntitlements: true,
      leaveRequests: true,
    },
  });

  if (!employee) {
    return <div className="p-6">Employee not found.</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{employee.firstName} {employee.lastName} - Overview</h1>
        <AddLeaveRequestDialog employeeId={employee.id} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Personal Info</CardTitle>
          </CardHeader>
          <CardContent>
            <PersonalInfoPanel employee={employee} />
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Leave Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaveBalancePanel leaveEntitlements={employee.leaveEntitlements} employeeId={employee.id} />
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-1">
          <CardHeader>
            <CardTitle>Leave Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaveCalendar leaveRequests={employee.leaveRequests} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
