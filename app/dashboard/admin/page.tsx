// /app/dashboard/admin/page.tsx

"use client";

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
      <header className="w-full flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-surface dark:bg-surface-dark border-b dark:border-neutral-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
        <div className="relative mt-3 sm:mt-0 w-full sm:w-64">
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500" />
        </div>
      </header>

      {/* Grid */}
      <main className="flex-1 p-6 w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <DashboardWidget title="Outstanding Requests" icon={ClipboardList}>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">7</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Awaiting approval</p>
          </DashboardWidget>

          <DashboardWidget title="People Metrics" icon={Users}>
            <ul className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
              <li>Active Employees: <span className="font-semibold text-gray-900 dark:text-gray-100">42</span></li>
              <li>Managers: <span className="font-semibold text-gray-900 dark:text-gray-100">5</span></li>
              <li>New Starters This Month: <span className="font-semibold text-gray-900 dark:text-gray-100">3</span></li>
            </ul>
          </DashboardWidget>

          <DashboardWidget title="Holiday Balance" icon={CalendarCheck2}>
            <ul className="space-y-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
              <li>Total Entitlement: <span className="font-semibold text-gray-900 dark:text-gray-100">1200 days</span></li>
              <li>Used: <span className="font-semibold text-gray-900 dark:text-gray-100">730 days</span></li>
              <li>Remaining: <span className="font-semibold text-gray-900 dark:text-gray-100">470 days</span></li>
            </ul>
            <Button className="w-full">Book Holiday</Button>
          </DashboardWidget>

          <DashboardWidget title="Quick Actions" icon={Megaphone}>
            <ul className="space-y-2 text-sm">
              {[
                { label: "Post News", href: "#" },
                { label: "Start Survey", href: "#" },
                { label: "Add Company Document", href: "#" },
                { label: "Email Employee", href: "#" },
              ].map((action) => (
                <li key={action.label}>
                  <Link href={action.href} className="text-primary hover:underline">{action.label}</Link>
                </li>
              ))}
            </ul>
          </DashboardWidget>

          <DashboardWidget title="Documents Expiring Soon" icon={FileWarning}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-gray-100">6</span> total: 4 employee contracts and 2 policies expiring in the next <span className="font-semibold text-gray-900 dark:text-gray-100">3 months</span>.
            </p>
            <Link href="#" className="text-primary text-sm hover:underline mt-2 inline-block">
              Review expiring files
            </Link>
          </DashboardWidget>

          <DashboardWidget title="HR Insights" icon={BarChartBig}>
            <ul className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
              <li>Turnover (12 mo): <span className="font-semibold text-gray-900 dark:text-gray-100">18.2%</span></li>
              <li>1-Day Absence Rate: <span className="font-semibold text-gray-900 dark:text-gray-100">36%</span></li>
              <li>Median Sick Days: <span className="font-semibold text-gray-900 dark:text-gray-100">5.1 days</span></li>
            </ul>
          </DashboardWidget>
        </div>
      </main>
    </div>
  );
}
