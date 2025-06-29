import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import LeaveBalancePanel from "@/components/LeaveBalancePanel";
import PersonalInfoPanel from "@/components/PersonalInfoPanel";
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
      manager: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  if (!employee) {
    return <div className="p-6">Employee not found.</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold">
        {employee.firstName} {employee.lastName} - Overview
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Personal Info</CardTitle>
          </CardHeader>
          <CardContent>
            <PersonalInfoPanel employee={employee} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaveBalancePanel
              leaveEntitlements={employee.leaveEntitlements}
              employeeId={employee.id}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
