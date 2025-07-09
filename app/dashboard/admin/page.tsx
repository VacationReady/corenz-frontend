// app/dashboard/admin/page.tsx   (Server Component)

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import LeaveBalanceWidget from "@/components/dashboard/LeaveBalanceWidget";
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
import Link from "next/link";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  if (!user?.employee) redirect("/dashboard/employee");

  const firstName = user.firstName ?? "Admin";
  const employeeId = user.employee.id;

  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Header & Search (unchanged) */}
      <div className="w-full px-6 pt-6 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">
          Hi, {firstName} 👋
        </h1>
        <div className="flex items-center gap-4">
          <Bell className="w-6 h-6" />
          <Link href="/profile">
            <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center">
              {firstName.slice(0,2).toUpperCase()}
            </div>
          </Link>
        </div>
      </div>
      <div className="w-full px-6 mt-4 mb-2 relative max-w-md">
        <input
          type="text"
          placeholder="Search..."
          className="w-full rounded-lg border px-4 py-2"
        />
        <Search className="absolute right-3 top-2.5 w-5 h-5" />
      </div>

      {/* Unified Grid */}
      <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* 1) Server-side leave balances */}
        <LeaveBalanceWidget employeeId={employeeId} />

        {/* 2) Quick Actions */}
        <DashboardWidget
          title="Quick Actions"
          icon={Megaphone}
          className="h-full"
        >
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Post News", icon: FileText },
              { label: "Start Survey", icon: FilePlus2 },
              { label: "Add Document", icon: FileText },
              { label: "Email Employee", icon: Mail },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                className="flex flex-col items-center p-3"
              >
                <Icon className="w-5 h-5 mb-1" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </DashboardWidget>

        {/* 3) People Metrics */}
        <DashboardWidget title="People Metrics" icon={Users} className="h-full">
          <ul>
            <li>Active: 46</li>
            <li>Managers: 5</li>
            <li>New This Month: 3</li>
          </ul>
        </DashboardWidget>

        {/* 4) Pending Approvals */}
        <DashboardWidget
          title="Pending Approvals"
          icon={ClipboardList}
          className="h-full"
        >
          <p className="text-4xl">7</p>
          <p>Awaiting your approval</p>
        </DashboardWidget>

        {/* 5) Who’s Off */}
        <DashboardWidget title="Who's Off" icon={CalendarCheck2} className="h-full">
          <p>Loading leave data…</p>
        </DashboardWidget>
      </main>
    </div>
  );
}
