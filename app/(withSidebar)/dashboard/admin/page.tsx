// app/(withSidebar)/dashboard/admin/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import LeaveSummaryCard from "@/components/dashboard/LeaveSummaryCard";
import AdminDashboardClient from "./AdminDashboardClient";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { User } from "lucide-react";
import { EnhancedWidget } from "@/components/ui/EnhancedWidget";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/login");
  const role = session.user.role;
  if (!(role === "ADMIN" || role === "SUPER_ADMIN")) {
    redirect("/unauthorized");
  }
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      Employee: {
        include: { LeaveEntitlement: { include: { EventCategory: true } } },
      },
      JobRole: { select: { name: true } },
      Department_User_departmentIdToDepartment: { select: { name: true } },
    },
  });

  if (!user?.Employee) {
    if (isSuperAdmin) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-2xl font-semibold">Welcome, super admin</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            You don&apos;t have an employee profile in this tenant, so the
            standard admin dashboard widgets aren&apos;t available. You can still
            use the top navigation to manage tenants and switch between
            companies.
          </p>
        </div>
      );
    }

    redirect("/dashboard/employee");
  }

  if (isSuperAdmin) {
    redirect("/tenants");
  }

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ") || user.name || "User";
  const roleLabel = user.role ?? "User";
  const departmentName = user.Department_User_departmentIdToDepartment?.name;
  const jobRoleName = user.JobRole?.name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Ambient background effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[hsl(var(--sunset-2))]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col w-full h-screen overflow-hidden">
        {/* Enhanced Hero Profile Card */}
        <div className="p-6">
          <div className="glass-premium rounded-3xl shadow-premium p-8 hover-lift-premium transition-premium">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-6">
                {/* Enhanced Avatar with gradient ring */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary via-[hsl(var(--sunset-2))] to-[hsl(var(--sunset-3))] rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-500" />
                  <div className="relative w-20 h-20 bg-gradient-to-br from-primary to-[hsl(var(--sunset-2))] rounded-2xl flex items-center justify-center shadow-premium">
                    <span className="text-2xl font-bold text-white">
                      {user.firstName?.charAt(0) || "U"}
                    </span>
                  </div>
                  {/* Status indicator */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-[3px] border-white shadow-lg" />
                </div>

                {/* User Info with gradient text */}
                <div>
                  <h1 className="text-3xl font-bold text-gradient-premium">{fullName}</h1>
                  <p className="text-muted-foreground mt-1">{user.email}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                      {roleLabel}
                    </span>
                    {departmentName && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-[hsl(var(--sunset-2))]/10 text-sunset-2 border border-[hsl(var(--sunset-2))]/20">
                        {departmentName}
                      </span>
                    )}
                    {jobRoleName && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-[hsl(var(--sunset-3))]/10 text-sunset-3 border border-[hsl(var(--sunset-3))]/20">
                        {jobRoleName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions - enhanced */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
                <Link href={`/employees/${user.Employee.id}/overview`}>
                  <Button className="bg-gradient-to-r from-primary to-[hsl(var(--sunset-2))] hover:from-primary/90 hover:to-[hsl(var(--sunset-2))]/90 shadow-premium">
                    <User className="h-4 w-4 mr-2" /> View profile
                  </Button>
                </Link>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    aria-label="Search dashboard"
                    className="w-full sm:w-64 glass-subtle rounded-2xl border-white/20 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/30 transition-premium"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area - Bento Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bento-grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            <EnhancedWidget size="medium" delay={0.05}>
              <LeaveSummaryCard employeeId={user.Employee.id} />
            </EnhancedWidget>

            <EnhancedWidget size="medium" delay={0.1}>
              <AdminDashboardClient
                employeeId={user.Employee.id}
                firstName={user.firstName ?? ""}
                section="quick-actions"
              />
            </EnhancedWidget>

            <EnhancedWidget size="medium" delay={0.15}>
              <AdminDashboardClient
                employeeId={user.Employee.id}
                firstName={user.firstName ?? ""}
                section="calendar"
              />
            </EnhancedWidget>

            <EnhancedWidget size="medium" delay={0.2}>
              <AdminDashboardClient
                employeeId={user.Employee.id}
                firstName={user.firstName ?? ""}
                section="people-metrics"
              />
            </EnhancedWidget>

            <EnhancedWidget size="large" delay={0.25}>
              <AdminDashboardClient
                employeeId={user.Employee.id}
                firstName={user.firstName ?? ""}
                section="action-items"
              />
            </EnhancedWidget>

            <EnhancedWidget size="large" delay={0.3}>
              <AdminDashboardClient
                employeeId={user.Employee.id}
                firstName={user.firstName ?? ""}
                section="news"
              />
            </EnhancedWidget>
          </div>
        </div>
      </div>
    </div>
  );
}
