// app/(withSidebar)/dashboard/admin/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import LeaveSummaryCard from "@/components/dashboard/LeaveSummaryCard";

const AdminDashboardClient = dynamic(() => import("./AdminDashboardClient"), {
  ssr: false,
});

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      employee: {
        include: { leaveEntitlements: { include: { eventCategory: true } } },
      },
    },
  });

  if (!user?.employee) redirect("/dashboard/employee");

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
                  {user.firstName || "User"}
                </h1>
                <p className="text-sm text-muted-foreground mb-1">Co-Founder</p>
                <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                  <span>📍 London</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 font-medium">
                      Up to date
                    </span>
                  </div>
                </div>
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
            <LeaveSummaryCard employeeId={user.employee.id} />

            {/* Quick Actions */}
            <AdminDashboardClient
              employeeId={user.employee.id}
              firstName={user.firstName ?? ""}
              section="quick-actions"
            />

            {/* Calendar */}
            <AdminDashboardClient
              employeeId={user.employee.id}
              firstName={user.firstName ?? ""}
              section="calendar"
            />

            {/* People Metrics */}
            <AdminDashboardClient
              employeeId={user.employee.id}
              firstName={user.firstName ?? ""}
              section="people-metrics"
            />
          </div>

          {/* Bottom Row - 2 cards filling remaining space */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0 overflow-hidden">
            {/* Action Items - Fixed height container */}
            <div className="flex flex-col min-h-0">
              <AdminDashboardClient
                employeeId={user.employee.id}
                firstName={user.firstName ?? ""}
                section="action-items"
              />
            </div>

            {/* News Widget - spans 3 columns with fixed height container */}
            <div className="lg:col-span-3 flex flex-col min-h-0">
              <AdminDashboardClient
                employeeId={user.employee.id}
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
