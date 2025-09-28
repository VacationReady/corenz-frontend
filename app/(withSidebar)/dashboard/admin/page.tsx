// app/(withSidebar)/dashboard/admin/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import LeaveSummaryCard from "@/components/dashboard/LeaveSummaryCard";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/login");
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

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden">
      {/* Hero Profile Card - Compact */}
      <div className="p-4">
        <div className="glass rounded-3xl shadow-glass p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Avatar */}
              <div className="w-16 h-16 bg-gradient-to-br from-sunset-1 to-sunset-2 rounded-2xl flex items-center justify-center shadow-warm">
                <span className="text-xl font-bold text-white">
                  {user.firstName?.charAt(0) || "U"}
                </span>
              </div>
              {/* Profile Info */}
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">
                  {user.firstName || user.name || "User"}
                </h1>
                {(user.JobRole?.name ||
                  user.Department_User_departmentIdToDepartment?.name) && (
                  <p className="text-sm text-muted-foreground mb-1">
                    {[user.JobRole?.name, user.Department_User_departmentIdToDepartment?.name]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
              <input
                type="text"
                placeholder="Search..."
                className="w-full glass-subtle rounded-2xl border-glass px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-glass"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Grid - Full screen layout */}
      <main className="flex-1 p-4 overflow-hidden">
        <div className="h-full flex flex-col gap-4">
          {/* Top Row - 4 cards with flexible height */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[18rem]">
            {/* Holiday Balance Card - Compact */}
            <LeaveSummaryCard employeeId={user.Employee.id} />

            {/* Quick Actions */}
            <AdminDashboardClient
              employeeId={user.Employee.id}
              firstName={user.firstName ?? ""}
              section="quick-actions"
            />

            {/* Calendar */}
            <AdminDashboardClient
              employeeId={user.Employee.id}
              firstName={user.firstName ?? ""}
              section="calendar"
            />

            {/* People Metrics */}
            <AdminDashboardClient
              employeeId={user.Employee.id}
              firstName={user.firstName ?? ""}
              section="people-metrics"
            />
          </div>

          {/* Bottom Row - Action items given more width */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0 overflow-hidden">
            {/* Action Items - wider on large screens */}
            <div className="lg:col-span-2 flex flex-col min-h-0">
              <AdminDashboardClient
                employeeId={user.Employee.id}
                firstName={user.firstName ?? ""}
                section="action-items"
              />
            </div>

            {/* News Widget - reduced width and on the right */}
            <div className="lg:col-span-2 flex flex-col min-h-0">
              <AdminDashboardClient
                employeeId={user.Employee.id}
                firstName={user.firstName ?? ""}
                section="news"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
