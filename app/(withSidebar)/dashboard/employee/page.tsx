import { PageShell } from "@/components/ui/PageShell";
import DashboardGrid from "@/components/ui/DashboardGrid";
import LeaveSummaryCard from "@/components/dashboard/LeaveSummaryCard";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import EmployeeDashboardClient from "./EmployeeDashboardClient";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { User } from "lucide-react";

export default async function EmployeeDashboard() {
  const session = await auth();
  const userId = session?.user?.id;
  let employeeId: string | undefined = undefined;
  if (userId && session?.user?.companyId) {
    const employee = await prisma.employee.findFirst({
      where: { userId, companyId: session.user.companyId },
      select: { id: true },
    });
    employeeId = employee?.id;

    // Check for active onboarding - redirect if pending steps exist
    if (employeeId) {
      const activeOnboarding = await prisma.onboardingInstance.findFirst({
        where: {
          employeeId,
          status: { in: ["active", "in_progress"] },
        },
        include: {
          OnboardingStepInstance: {
            where: { status: { not: "completed" } },
            take: 1,
          },
        },
      });

      // If there's an active onboarding with uncompleted steps, redirect
      if (activeOnboarding?.OnboardingStepInstance?.length) {
        redirect(`/${employeeId}/onboarding`);
      }
    }
  }

  const user = userId ? await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true },
  }) : null;

  const title = user?.firstName ? `Hi ${user.firstName}` : "Employee Dashboard";

  return (
    <PageShell
      title={title}
      breadcrumbs={{
        items: [
          { label: "Dashboard", href: "/dashboard" },
          { label: "Employee" },
        ],
      }}
      action={
        employeeId ? (
          <div className="flex items-center gap-2">
            <Link href={`/employees/${employeeId}/overview`}>
              <Button size="sm" icon={<User className="h-4 w-4" />}>View profile</Button>
            </Link>
          </div>
        ) : null
      }
    >
      <DashboardGrid>
        {employeeId && <LeaveSummaryCard employeeId={employeeId} />}
        <NewsWidget limit={5} />
        <EmployeeDashboardClient employeeId={employeeId} />
      </DashboardGrid>
    </PageShell>
  );
}
