import { Card } from "@/components/ui/Card";
import LeaveBalancePanel from "@/components/LeaveBalancePanel";
import Link from "next/link";
import AddLeaveRequestDialog from "@/components/AddLeaveRequestDialog";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";
import dynamic from "next/dynamic";
const ProfileAvatarUploader = dynamic(
  () => import("@/components/employees/ProfileAvatarUploader"),
  { ssr: false },
);

interface PageProps {
  params: { id: string };
}

export default async function EmployeeOverviewPage({ params }: PageProps) {
  const employeeId = params.id;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      // 👇 include nested eventCategory on each entitlement
      leaveEntitlements: {
        include: { eventCategory: true },
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          profileImageUrl: true,
          jobRole: { select: { name: true } },
          department: { select: { name: true } },
          manager: {
            select: { firstName: true, lastName: true },
          },
          permissionProfile: {
            select: {
              id: true,
              name: true,
              description: true,
              builtIn: true,
            },
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
      <div className="flex flex-col items-center gap-3">
        <ProfileAvatarUploader
          userId={employee.userId}
          name={`${employee.user.firstName ?? ""} ${employee.user.lastName ?? ""}`.trim()}
          initialUrl={employee.user.profileImageUrl}
        />
        <h1 className="text-2xl font-semibold text-center">
          {employee.user.firstName ?? ""} {employee.user.lastName ?? ""} -
          Overview
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Summary cards */}
        <Card>
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Contact Info</h2>
          </div>
          <div className="p-4 space-y-1 text-sm">
            <p><strong>Email:</strong> {employee.user.email}</p>
            <p><strong>Phone:</strong> {employee.user.phone || "N/A"}</p>
            <Link href={`/employees/${employee.id}/contact-info`} className="text-blue-600 underline text-sm">Manage</Link>
          </div>
        </Card>

        <Card>
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Demographic</h2>
          </div>
          <div className="p-4 space-y-1 text-sm">
            <p><strong>Start date:</strong> {employee.user.createdAt.toDateString()}</p>
            <Link href={`/employees/${employee.id}/demographic`} className="text-blue-600 underline text-sm">Manage</Link>
          </div>
        </Card>

        <Card>
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Bank & Payroll</h2>
          </div>
          <div className="p-4 space-y-1 text-sm">
            <p><strong>Bank:</strong> Hidden</p>
            <Link href={`/employees/${employee.id}/bank-payroll`} className="text-blue-600 underline text-sm">Manage</Link>
          </div>
        </Card>

        <Card>
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Emergency Contacts</h2>
          </div>
          <div className="p-4 space-y-1 text-sm">
            <p className="text-muted-foreground">Manage next-of-kin and contacts</p>
            <Link href={`/employees/${employee.id}/emergency-contacts`} className="text-blue-600 underline text-sm">Manage</Link>
          </div>
        </Card>

        <Card>
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Employment Details</h2>
          </div>
          <div className="p-4 space-y-1 text-sm">
            <p><strong>Status:</strong> {employee.isActive ? "Active" : "Inactive"}</p>
            <p><strong>Department:</strong> {employee.user.department?.name || "N/A"}</p>
            <Link href={`/employees/${employee.id}/employment-details`} className="text-blue-600 underline text-sm">Manage</Link>
          </div>
        </Card>

        {/* Leave Balances + Leave Booking */}
        <Card>
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Leave Balances</h2>
          </div>
          <div className="p-4 space-y-4">
            <LeaveBalancePanel
              leaveEntitlements={employee.leaveEntitlements}
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
                    This confirms your Dialog component is functioning and opens
                    correctly.
                  </DialogDescription>
                </DialogHeader>
                <p>
                  If you can see this modal, your Dialog system is working
                  correctly.
                </p>
              </DialogContent>
            </Dialog>
          </div>
        </Card>
      </div>
    </div>
  );
}
