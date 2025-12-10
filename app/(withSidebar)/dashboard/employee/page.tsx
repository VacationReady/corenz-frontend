import LeaveSummaryCard from "@/components/dashboard/LeaveSummaryCard";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import EmployeeDashboardClient from "./EmployeeDashboardClient";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { User } from "lucide-react";
import { EnhancedWidget } from "@/components/ui/EnhancedWidget";
import { Avatar } from "@/components/ui/Avatar";
import { getDownloadUrl } from "@/lib/getDownloadUrl";

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
    select: {
      firstName: true,
      lastName: true,
      name: true,
      profileImageUrl: true,
    },
  }) : null;

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.name ||
    "User";

  const avatarUrl = user?.profileImageUrl
    ? await getDownloadUrl(user.profileImageUrl)
    : null;

  const displayFirstName = user?.firstName || "User";

  return (
    <div className="h-full">
      <div className="relative z-10 flex flex-col w-full h-full overflow-y-auto">
        {/* Compact Hero Header */}
        <div className="p-4">
          <div className="glass-premium rounded-2xl shadow-premium p-5 hover-lift-premium transition-premium">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute -inset-1.5 bg-gradient-to-br from-primary to-[hsl(var(--sunset-2))] rounded-full opacity-60 blur-md" />
                  <Avatar
                    src={avatarUrl ?? undefined}
                    name={fullName}
                    size={56}
                    className="relative border-2 border-white shadow-premium"
                  />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-primary">
                    Hi, {displayFirstName}!
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Dashboard &rsaquo; Employee
                  </p>
                </div>
              </div>
              {employeeId && (
                <div className="flex items-center gap-2">
                  <Link href={`/employees/${employeeId}/overview`}>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-premium">
                      <User className="h-4 w-4 mr-2" /> View profile
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - Two Row Layout */}
        <div className="flex-1 p-4 pt-0">
          {/* Top Row: Leave Balance, Today's Shift, Upcoming Leave */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {employeeId && (
              <EnhancedWidget size="small" delay={0.05}>
                <LeaveSummaryCard employeeId={employeeId} />
              </EnhancedWidget>
            )}
            <EmployeeDashboardClient employeeId={employeeId} section="top" />
          </div>
          
          {/* Bottom Row: Action Items & News (can stretch) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EmployeeDashboardClient employeeId={employeeId} section="bottom" />
            <EnhancedWidget size="medium" delay={0.2}>
              <NewsWidget limit={4} />
            </EnhancedWidget>
          </div>
        </div>
      </div>
    </div>
  );
}
