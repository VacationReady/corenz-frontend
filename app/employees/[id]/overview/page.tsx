import { Card } from "@/components/ui/Card";
import LeaveBalancePanel from "@/components/LeaveBalancePanel";
import PersonalInfoPanel from "@/components/PersonalInfoPanel";
import AddLeaveRequestDialog from "@/components/AddLeaveRequestDialog";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
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
        {employee.user.firstName ?? ""} {employee.user.lastName ?? ""} - Overview
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Info Panel */}
        <Card>
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Personal Info</h2>
          </div>
          <div className="p-4">
            <PersonalInfoPanel
              employee={{
                firstName: employee.user.firstName ?? "",
                lastName: employee.user.lastName ?? "",
                email: employee.user.email ?? "",
                phone: employee.user.phone ?? undefined,
                jobTitle: employee.user.jobRole?.name ?? undefined,
                department: employee.user.department?.name ?? undefined,
                startDate: employee.user.createdAt,
                employmentStatus: employee.isActive ? "Active" : "Inactive",
                manager: employee.user.manager
                  ? {
                      firstName: employee.user.manager.firstName ?? "",
                      lastName: employee.user.manager.lastName ?? "",
                    }
                  : undefined,
              }}
            />
          </div>
        </Card>

        {/* Leave Balances + Leave Booking */}
        <Card>
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Leave Balances</h2>
          </div>
          <div className="p-4 space-y-4">
            <LeaveBalancePanel
              leaveEntitlement={employee.leaveEntitlement}
              employeeId={employee.id}
            />

            {/* ✅ Leave Booking Button */}
            <AddLeaveRequestDialog
              employeeId={employee.id}
              isAdminOrManager={true}
            />

            {/* ✅ Test Modal for Debugging */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost">Open Test Modal</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Test Modal</DialogTitle>
                  <DialogDescription>
                    This confirms your Dialog component is functioning and opens correctly.
                  </DialogDescription>
                </DialogHeader>
                <p>If you can see this modal, your Dialog system is working correctly.</p>
              </DialogContent>
            </Dialog>
          </div>
        </Card>
      </div>
    </div>
  );
}
