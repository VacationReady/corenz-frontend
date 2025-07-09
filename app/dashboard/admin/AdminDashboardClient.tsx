// app/dashboard/admin/AdminDashboardClient.tsx
"use client";

import { DashboardWidget } from "@/components/ui/DashboardWidget";
import {
  Megaphone,
  FileText,
  FilePlus2,
  Mail,
  Users,
  ClipboardList,
  CalendarCheck2,
} from "lucide-react";

interface Props {
  employeeId: string;
  firstName: string;
}

export default function AdminDashboardClient({ employeeId, firstName }: Props) {
  return (
    <>
      {/* Quick Actions */}
      <DashboardWidget title="Quick Actions" icon={Megaphone} className="h-full">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Post News", icon: FileText },
            { label: "Start Survey", icon: FilePlus2 },
            { label: "Add Document", icon: FileText },
            { label: "Email Employee", icon: Mail },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              className="flex flex-col items-center justify-center bg-white border rounded-lg p-3"
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </DashboardWidget>

      {/* People Metrics */}
      <DashboardWidget title="People Metrics" icon={Users} className="h-full">
        <ul className="space-y-1 text-sm">
          <li>Active Employees: 46</li>
          <li>Managers: 5</li>
          <li>New Starters: 3</li>
        </ul>
      </DashboardWidget>

      {/* Pending Approvals */}
      <DashboardWidget title="Pending Approvals" icon={ClipboardList} className="h-full">
        <p className="text-4xl font-bold">7</p>
        <p className="text-sm">Awaiting your approval</p>
      </DashboardWidget>

      {/* Who’s Off */}
      <DashboardWidget title="Who's Off" icon={CalendarCheck2} className="h-full">
        <p className="text-sm">Loading leave data...</p>
      </DashboardWidget>
    </>
  );
}
