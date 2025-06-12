'use client';

import { DashboardWidget } from "@/components/ui/DashboardWidget";
import Link from "next/link";
import {
  ClipboardList,
  Users,
  CalendarCheck2,
  Megaphone,
  Search,
  FileWarning,
  BarChartBig,
} from "lucide-react";
import Button from "@/components/ui/Button";

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Header */}
      <header className="w-full h-14 bg-neutral-800 flex items-center justify-between px-6 shadow">
        <h1 className="text-lg font-semibold">Admin Dashboard</h1>
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-md border border-neutral-700 bg-neutral-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>
      </header>

      {/* Grid */}
      <main className="flex-1 p-6 w-full max-w-screen-2xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
          <DashboardWidget title="Outstanding Requests" icon={ClipboardList}>
            <p className="text-2xl font-semibold text-neutral-200">7</p>
            <p className="text-sm text-neutral-400">Awaiting approval</p>
          </DashboardWidget>

          <DashboardWidget title="People Metrics" icon={Users}>
            <ul className="space-y-1 text-sm text-neutral-400">
              <li>Active Employees: <strong>42</strong></li>
              <li>Managers: <strong>5</strong></li>
              <li>New Starters This Month: <strong>3</strong></li>
            </ul>
          </DashboardWidget>

          <DashboardWidget title="Holiday Balance" icon={CalendarCheck2}>
            <ul className="space-y-1 text-sm text-neutral-400 mb-4">
              <li>Total Entitlement: <strong>1200 days</strong></li>
              <li>Used: <strong>730 days</strong></li>
              <li>Remaining: <strong>470 days</strong></li>
            </ul>
            <Button className="mt-2">Book Holiday</Button>
          </DashboardWidget>

          <DashboardWidget title="Quick Actions" icon={Megaphone}>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li><Link href="#" className="text-indigo-400 hover:underline">Post News</Link></li>
              <li><Link href="#" className="text-indigo-400 hover:underline">Start Survey</Link></li>
              <li><Link href="#" className="text-indigo-400 hover:underline">Add Company Document</Link></li>
              <li><Link href="#" className="text-indigo-400 hover:underline">Email Employee</Link></li>
            </ul>
          </DashboardWidget>

          <DashboardWidget title="Documents Expiring Soon" icon={FileWarning}>
            <p className="text-sm text-neutral-400">
              <strong>6</strong> total: 4 employee contracts and 2 policies expiring in the next <strong>3 months</strong>.
            </p>
            <Link href="#" className="text-indigo-400 text-sm hover:underline mt-2 inline-block">
              Review expiring files
            </Link>
          </DashboardWidget>

          <DashboardWidget title="HR Insights" icon={BarChartBig}>
            <ul className="space-y-1 text-sm text-neutral-400">
              <li>Turnover (12 mo): <strong>18.2%</strong></li>
              <li>1-Day Absence Rate: <strong>36%</strong></li>
              <li>Median Sick Days: <strong>5.1 days</strong></li>
            </ul>
          </DashboardWidget>
        </div>
      </main>
    </div>
  );
}
