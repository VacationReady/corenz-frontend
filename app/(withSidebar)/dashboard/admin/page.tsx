'use client';

import { DashboardWidget } from "@/components/ui/DashboardWidget";
import Link from "next/link";
import {
  ClipboardList,
  Users,
  CalendarCheck2,
  Megaphone,
  Search,
} from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-100 text-neutral-800">
      
      {/* Top Bar */}
      <header className="w-full h-14 bg-neutral-900 text-white flex items-center justify-between px-6 shadow z-10">
        <h1 className="text-lg font-semibold">Admin Dashboard</h1>
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>
      </header>

      {/* Dashboard Grid */}
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

          {/* 1. Outstanding Requests */}
          <DashboardWidget title="Outstanding Requests" icon={ClipboardList}>
            <p className="text-2xl font-semibold text-neutral-800">7</p>
            <p className="text-sm text-gray-600">Awaiting approval</p>
          </DashboardWidget>

          {/* 2. People Metrics */}
          <DashboardWidget title="People Metrics" icon={Users}>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>Active Employees: <strong>42</strong></li>
              <li>Managers: <strong>5</strong></li>
              <li>New Starters This Month: <strong>3</strong></li>
            </ul>
          </DashboardWidget>

          {/* 3. Holiday Balance */}
          <DashboardWidget title="Holiday Balance" icon={CalendarCheck2}>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>Total Entitlement: <strong>1200 days</strong></li>
              <li>Used: <strong>730 days</strong></li>
              <li>Remaining: <strong>470 days</strong></li>
            </ul>
          </DashboardWidget>

          {/* 4. Quick Actions */}
          <DashboardWidget title="Quick Actions" icon={Megaphone}>
            <ul className="space-y-2 text-sm text-gray-700">
              <li><Link href="#" className="text-indigo-600 hover:underline">Post News</Link></li>
              <li><Link href="#" className="text-indigo-600 hover:underline">Start Survey</Link></li>
              <li><Link href="#" className="text-indigo-600 hover:underline">Add Company Document</Link></li>
              <li><Link href="#" className="text-indigo-600 hover:underline">Email Employee</Link></li>
            </ul>
          </DashboardWidget>

        </div>
      </main>
    </div>
  );
}
