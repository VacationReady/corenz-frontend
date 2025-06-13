'use client';

import { DashboardWidget } from "@/components/ui/DashboardWidget";
import Link from "next/link";
import {
  CalendarCheck2,
  Users,
  Clock,
  BarChart3,
  Search,
} from "lucide-react";
import Button from "@/components/ui/Button";

export default function ManagerDashboardPage() {
  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Header */}
      <header className="w-full h-14 bg-neutral-800 flex items-center justify-between px-6 shadow">
        <h1 className="text-lg font-semibold text-white">Manager Dashboard</h1>
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-md border border-neutral-700 bg-neutral-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>
      </header>

      {/* Dashboard Grid */}
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
          {/* Holiday Balance */}
          <DashboardWidget title="Holiday Balance" icon={CalendarCheck2}>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>Total Entitlement: <strong>240 days</strong></li>
              <li>Used: <strong>130 days</strong></li>
              <li>Remaining: <strong>110 days</strong></li>
            </ul>
            <div className="mt-4">
              <Button size="sm">Book Holiday</Button>
            </div>
          </DashboardWidget>

          {/* Absences in Team */}
          <DashboardWidget title="Team Absences Today" icon={Users}>
            <ul className="text-sm text-gray-300">
              <li>John Smith (Sick Leave)</li>
              <li>Emily Davis (Annual Leave)</li>
              <li className="text-muted-foreground">+2 more...</li>
            </ul>
          </DashboardWidget>

          {/* Time Off Trends */}
          <DashboardWidget title="Time Off Trends" icon={Clock}>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>Avg Sick Days/Employee: <strong>3.2</strong></li>
              <li>Most Common Day Off: <strong>Friday</strong></li>
              <li>Peak Absence Month: <strong>August</strong></li>
            </ul>
          </DashboardWidget>

          {/* Team Insights */}
          <DashboardWidget title="Team Insights" icon={BarChart3}>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>Turnover (12 mo): <strong>8%</strong></li>
              <li>Avg Tenure: <strong>2.9 years</strong></li>
              <li>Single Day Absences: <strong>34%</strong></li>
            </ul>
          </DashboardWidget>
        </div>
      </main>
    </div>
  );
}
