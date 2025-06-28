// /app/dashboard/admin/page.tsx

"use client";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { useState, useEffect } from "react";
import { Search, CalendarCheck2, ClipboardList, Users, Megaphone } from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { DashboardWidget } from "@/components/ui/DashboardWidget";

export default function AdminDashboardPage() {
  const [name, setName] = useState<string | null>("Admin");

  useEffect(() => {
    const fetchSession = async () => {
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      if (session?.user?.name) setName(session.user.name);
    };
    fetchSession();
  }, []);

  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Header */}
      <header className="w-full px-6 py-6 bg-surface dark:bg-surface-dark border-b dark:border-neutral-700">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Good morning{name ? `, ${name}` : ""} 👋
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Here is what’s happening with your HR today.
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition"
            />
            <Search className="absolute right-3 top-3 w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="flex-1 p-6 w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
          {/* Leave Booking CTA */}
          <DashboardWidget title="Book Leave" icon={CalendarCheck2} className="h-full bg-gradient-to-br from-primary to-purple-500 text-white">
            <p className="text-sm mb-4">Quickly book leave for yourself or a team member.</p>
            <Button className="bg-white text-primary hover:bg-gray-100 w-full">Book Leave</Button>
          </DashboardWidget>

          {/* Quick Actions */}
          <DashboardWidget title="Quick Actions" icon={Megaphone} className="h-full">
            <ul className="space-y-2 text-sm">
              {["Post News", "Start Survey", "Add Company Document", "Email Employee"].map((action) => (
                <li key={action}>
                  <Link href="#" className="text-primary hover:underline">{action}</Link>
                </li>
              ))}
            </ul>
          </DashboardWidget>

          {/* People Metrics */}
          <DashboardWidget title="People Metrics" icon={Users} className="h-full">
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <li>Active Employees: <span className="font-semibold text-gray-900 dark:text-gray-100">42</span></li>
              <li>Managers: <span className="font-semibold text-gray-900 dark:text-gray-100">5</span></li>
              <li>New Starters This Month: <span className="font-semibold text-gray-900 dark:text-gray-100">3</span></li>
            </ul>
          </DashboardWidget>

          {/* Upcoming Approvals */}
          <DashboardWidget title="Pending Approvals" icon={ClipboardList} className="h-full">
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">7</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Awaiting your approval</p>
          </DashboardWidget>

          {/* Placeholder for future charts/calendar */}
          <DashboardWidget title="Your HR Overview" icon={Users} className="h-full">
            <p className="text-sm text-gray-500 dark:text-gray-400">Charts and calendar will appear here in Phase 2 for full HR insights at a glance.</p>
          </DashboardWidget>
        </div>
      </main>
    </div>
  );
}
