// app/(withSidebar)/dashboard/admin/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import LeaveSummaryCard from "@/components/dashboard/LeaveSummaryCard";

const AdminDashboardClient = dynamic(() => import("./AdminDashboardClient"), { ssr: false });

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      employee: { include: { leaveEntitlements: { include: { eventCategory: true } } } },
    },
  });

  if (!user?.employee) redirect("/dashboard/employee");

  return (
    <div className="flex flex-col flex-1 w-full min-h-screen">
      {/* Hero Profile Card */}
      <div className="p-6">
        <div className="glass rounded-3xl shadow-glass p-8 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Avatar */}
              <div className="w-20 h-20 bg-gradient-to-br from-sunset-1 to-sunset-2 rounded-3xl flex items-center justify-center shadow-warm">
                <span className="text-2xl font-bold text-white">
                  {user.firstName?.charAt(0) || "U"}
                </span>
              </div>
              {/* Profile Info */}
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-1">
                  {user.firstName || "User"}
                </h1>
                <p className="text-lg text-muted-foreground mb-2">Co-Founder</p>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>📍 London</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 font-medium">Up to date</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Search..."
                className="w-full glass-subtle rounded-2xl border-glass px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-glass"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <main className="flex-1 px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Leave Summary Card - spans 1 column */}
          <div className="lg:col-span-1">
            <LeaveSummaryCard employeeId={user.employee.id} />
          </div>

          {/* Client-only Admin Dashboard widgets - spans 2 columns */}
          <div className="lg:col-span-2">
            <AdminDashboardClient
              employeeId={user.employee.id}
              firstName={user.firstName ?? ""}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
