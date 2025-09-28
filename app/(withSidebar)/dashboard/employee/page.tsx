import { PageShell } from "@/components/ui/PageShell";
import DashboardGrid from "@/components/ui/DashboardGrid";
import LeaveBalanceWidget from "@/components/dashboard/LeaveBalanceWidget";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import EmployeeDashboardClient from "./EmployeeDashboardClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { User } from "lucide-react";

export default async function EmployeeDashboard() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  let employeeId: string | undefined = undefined;
  if (userId && session?.user?.companyId) {
    const employee = await prisma.employee.findFirst({
      where: { userId, companyId: session.user.companyId },
      select: { id: true },
    });
    employeeId = employee?.id;
  }

  return (
    <PageShell
      title="Employee Dashboard"
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employee" },
        ],
      }}
      action={
        employeeId ? (
          <Link href={`/employees/${employeeId}/overview`}>
            <Button size="sm" icon={<User className="h-4 w-4" />}>View profile</Button>
          </Link>
        ) : null
      }
    >
      <DashboardGrid>
        {employeeId && <LeaveBalanceWidget employeeId={employeeId} />}
        <NewsWidget limit={5} />
        <EmployeeDashboardClient employeeId={employeeId} />
      </DashboardGrid>
    </PageShell>
  );
}
