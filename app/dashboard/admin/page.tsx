// app/dashboard/admin/page.tsx

import { getServerSession } from "next-auth/next";
import type { NextAuthOptions } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import {
  Search,
  Bell,
  ClipboardList,
  Users,
  Megaphone,
  FileText,
  FilePlus2,
  Mail,
  CalendarCheck2,
} from "lucide-react";
// import LeaveBalanceWidget from "@/components/dashboard/LeaveBalanceWidget";

export default async function AdminDashboardPage() {
  // 1) Read session
  const session = await getServerSession(authOptions as NextAuthOptions);

  // 2) If not logged in, show a login prompt (no redirect)
  if (!session?.user) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4">You must be logged in to view this page.</p>
        <Link
          href="/login"
          className="text-indigo-600 hover:underline"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  // 3) Fetch your user record (with employee)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });

  // 4) If no employee record, show message
  if (!user?.employee) {
    return (
      <div className="p-6 text-center">
        No employee record found for your user.
      </div>
    );
  }

  const employeeId = user.employee.id;

  // 5) Finally, render your admin dashboard UI
  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Header */}
      <div className="w-full px-6 pt-6 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Hi, {user.firstName ?? "Admin"} 👋
        </h1>
        <div className="flex items-center gap-4">
          <div className="relative cursor-pointer">
            <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300 hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">
              3
            </span>
          </div>
          <div className="relative">
            <Link href="/profile">
              <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-800 font-semibold">
                {user.firstName?.slice(0, 2).toUpperCase() ?? "AD"}
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="w-full px-6 mt-4 mb-2">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
          <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>
      </div>

      <main className="flex-1 p-6 w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
        {/* Leave Balance Widget (re-enable once auth is stable) */}
        {/*
          <LeaveBalanceWidget employeeId={employeeId} />
        */}

        {/* Quick Actions */}
        <DashboardWidget title="Quick Actions" icon={Megaphone} className="h-full">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Post News", icon: FileText },
              { label: "Start Survey", icon: FilePlus2 },
              { label: "Add Document", icon: FileText },
              { label: "Email Employee", icon: Mail },
            ].map((action) => (
              <button
                key={action.label}
                className="flex flex-col items-center justify-center bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-3 hover:shadow-md hover:scale-105 transition-transform"
              >
                <action.icon className="w-5 h-5 text-indigo-600 mb-1" />
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </DashboardWidget>

        {/* People Metrics */}
        <DashboardWidget title="People Metrics" icon={Users} className="h-full">
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <li>
              Active Employees: <span className="font-semibold">46</span>
            </li>
            <li>
              Managers: <span className="font-semibold">5</span>
            </li>
            <li>
              New Starters This Month: <span className="font-semibold">3</span>
            </li>
          </ul>
        </DashboardWidget>

        {/* Pending Approvals */}
        <DashboardWidget title="Pending Approvals" icon={ClipboardList} className="h-full">
          <p className="text-4xl font-bold text-indigo-700 dark:text-indigo-300">7</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Awaiting your approval</p>
        </DashboardWidget>

        {/* Who's Off */}
        <DashboardWidget title="Who's Off" icon={CalendarCheck2} className="h-full">
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading leave data...</p>
        </DashboardWidget>
      </main>
    </div>
  );
}
