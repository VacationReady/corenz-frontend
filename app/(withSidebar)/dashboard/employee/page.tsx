import { PageShell } from "@/components/ui/PageShell";
import DashboardGrid from "@/components/ui/DashboardGrid";
import LeaveBalanceWidget from "@/components/dashboard/LeaveBalanceWidget";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import EmployeeDashboardClient from "./EmployeeDashboardClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

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
    >
      <DashboardGrid>
        {employeeId && <LeaveBalanceWidget employeeId={employeeId} />}
        <NewsWidget limit={5} />
        <EmployeeDashboardClient employeeId={employeeId} />
      </DashboardGrid>
    </PageShell>
  );
}
