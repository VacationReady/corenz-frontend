// app/dashboard/admin/AdminDashboardClient.tsx
"use client";

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

interface Props {
  employeeId: string;
  firstName?: string;
}

export default function AdminDashboardClient({ employeeId, firstName }: Props) {
  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Header */}
      <div className="w-full px-6 pt-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Hi, {firstName} 👋</h1>
        <div className="flex items-center gap-4">
          <Bell className="w-6 h-6" />
          <Link href="/profile">
            <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center">
              {firstName?.slice(0,2).toUpperCase()}
            </div>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 my-4 max-w-md relative">
        <input
          type="text"
          placeholder="Search..."
          className="w-full rounded-lg border px-4 py-2"
        />
        <Search className="absolute right-3 top-2.5 w-5 h-5" />
      </div>

      {/* Grid of cards */}
      <main className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <DashboardWidget title="Quick Actions" icon={<Megaphone />} className="h-full">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Post News", icon: <FileText className="w-5 h-5 mb-1" /> },
              { label: "Start Survey", icon: <FilePlus2 className="w-5 h-5 mb-1" /> },
              { label: "Add Document", icon: <FileText className="w-5 h-5 mb-1" /> },
              { label: "Email Employee", icon: <Mail className="w-5 h-5 mb-1" /> },
            ].map((action) => (
              <button
                key={action.label}
                className="flex flex-col items-center justify-center p-3 border rounded-lg"
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </DashboardWidget>

        {/* People Metrics */}
        <DashboardWidget title="People Metrics" icon={<Users />} className="h-full">
          <ul>
            <li>Active Employees: 46</li>
            <li>Managers: 5</li>
            <li>New Starters This Month: 3</li>
          </ul>
        </DashboardWidget>

        {/* Pending Approvals */}
        <DashboardWidget title="Pending Approvals" icon={<ClipboardList />} className="h-full">
          <p className="text-4xl">7</p>
          <p>Awaiting your approval</p>
        </DashboardWidget>

        {/* Who's Off */}
        <DashboardWidget title="Who's Off" icon={<CalendarCheck2 />} className="h-full">
          <p>Loading leave data…</p>
        </DashboardWidget>
      </main>
    </div>
  );
}
