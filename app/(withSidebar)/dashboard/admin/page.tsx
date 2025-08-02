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
    <div className="flex flex-col flex-1 w-full min-h-screen bg-content-panel">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-content-panel border-b border-enhanced backdrop-blur-sm">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Hi, {user.firstName ?? ""} 👋
            </h1>
            <p className="text-muted-foreground text-base">
              Welcome back to your admin dashboard
            </p>
          </div>
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded-md border border-enhanced bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
            />
          </div>
        </div>
      </div>

      {/* Unified Grid */}
      <main className="flex-1 px-8 py-6 w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Leave Summary Card */}
        <LeaveSummaryCard employeeId={user.employee.id} />

        {/* Client-only Admin Dashboard widgets */}
        <AdminDashboardClient
          employeeId={user.employee.id}
          firstName={user.firstName ?? ""}
        />
      </main>
    </div>
  );
}
