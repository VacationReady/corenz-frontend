import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
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
      leaveEntitlement: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          createdAt: true,
          jobRole: { select: { name: true } },
          department: { select: { name: true } },
          manager: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!employee) {
    return <div className="p-6">Employee not found.</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold">
        {employee.user.firstName} {employee.user.lastName} - Overview
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Personal Info</h2>
          </div>
          <div className="p-4">
            <PersonalInfoPanel
              employee={{
                firstName: employee.user.firstName,
                lastName: employee.user.lastName,
                email: employee.user.email,
                phone: employee.user.phone || undefined,
                jobTitle: employee.user.jobRole?.name || undefined,
                department: employee.user.department?.name || undefined,
                startDate: employee.user.createdAt,
                employmentStatus: employee.isActive ? "Active" : "Inactive",
              }}
              manager={employee.user.manager}
            />
          </div>
        </Card>

        <Card>
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Leave Balances</h2>
          </div>
          <div className="p-4">
            <LeaveBalancePanel
              leaveEntitlement={employee.leaveEntitlement}
              employeeId={employee.id}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
