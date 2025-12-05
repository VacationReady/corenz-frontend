// app/(withSidebar)/dashboard/admin/page.tsx

import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import LeaveSummaryCard from "@/components/dashboard/LeaveSummaryCard";
import AdminDashboardClient from "./AdminDashboardClient";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { User, Mail, Bot } from "lucide-react";
import { EnhancedWidget } from "@/components/ui/EnhancedWidget";
import { Avatar } from "@/components/ui/Avatar";
import { getDownloadUrl } from "@/lib/getDownloadUrl";

export default async function AdminDashboardPage() {
  const session = await auth();

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
  // Signed avatar URL like employee overview/profile
  const avatarUrl = user.profileImageUrl
    ? await getDownloadUrl(user.profileImageUrl)
    : null;

  return (
    <div className="h-full">
      <div className="relative z-10 flex flex-col w-full h-full overflow-y-auto">
        {/* Enhanced Hero Profile Card */}
        <div className="p-4">
          <div className="glass-premium rounded-2xl shadow-premium p-5 hover-lift-premium transition-premium">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar with org-chart glow */}
                <div className="relative">
                  <div className="absolute -inset-1.5 bg-gradient-to-br from-primary to-[hsl(var(--sunset-2))] rounded-full opacity-60 blur-md" />
                  <Avatar
                    src={avatarUrl ?? undefined}
                    name={fullName}
                    size={56}
                    className="relative border-2 border-white shadow-premium"
                  />
                </div>

                {/* User Info with gradient text */}
                <div>
                  <h1 className="text-2xl font-bold text-primary">
                    Hi, {user.firstName || "User"}!
                  </h1>
                  {(departmentName || jobRoleName) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
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
                  )}
                </div>
              </div>

              {/* Quick Actions - enhanced */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
                <Link href={`/employees/${user.Employee.id}/overview`}>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-premium">
                    <User className="h-4 w-4 mr-2" /> View profile
                  </Button>
                </Link>
                {/* Email Employee */}
                <Link href="/bulk-actions?action=messaging">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-premium">
                    <Mail className="h-4 w-4 mr-2" /> Email Employee
                  </Button>
                </Link>
                {/* AI Chatbot */}
                <Link href="/assistant">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-premium">
                    <Bot className="h-4 w-4 mr-2" /> AI Chatbot
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
        <div className="flex-1 p-4 pt-0">
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
