"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Bell, ChevronDown, CalendarCheck2, ClipboardList, Users, Megaphone } from "lucide-react";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { DashboardWidget } from "@/components/ui/DashboardWidget";

export default function AdminDashboardPage() {
  const [name, setName] = useState<string>("Admin");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      if (session?.user?.name) setName(session.user.name);
    };
    fetchSession();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Top Bar */}
      <div className="w-full px-6 py-4 flex items-center justify-between border-b bg-white dark:bg-neutral-900 dark:border-neutral-700">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Hi, {name} 👋
        </h1>
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <div className="relative cursor-pointer">
            <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">3</span>
          </div>
          {/* Avatar Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`}
                alt="Avatar"
                className="w-8 h-8 rounded-full"
              />
              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg z-50">
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                  Manage Profile
                </Link>
                <Link
                  href="#"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-700"
                >
                  Help
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Header with Search */}
      <header className="w-full px-6 py-6 bg-surface dark:bg-surface-dark">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
          <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>
      </header>

      {/* Grid */}
      <main className="flex-1 p-6 w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
          {/* Leave Booking CTA */}
          <DashboardWidget title="Book Leave" icon={CalendarCheck2} className="h-full">
            <p className="text-sm mb-4">Quickly book leave for yourself or a team member.</p>
            <Button className="bg-primary text-white hover:bg-primary/90 w-full">Book Leave</Button>
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

          {/* Pending Approvals */}
          <DashboardWidget title="Pending Approvals" icon={ClipboardList} className="h-full">
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">7</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Awaiting your approval</p>
          </DashboardWidget>

          {/* Placeholder for charts/calendar */}
          <DashboardWidget title="Your HR Overview" icon={Users} className="h-full">
            <p className="text-sm text-gray-500 dark:text-gray-400">Charts and calendar will appear here in Phase 2 for full HR insights at a glance.</p>
          </DashboardWidget>
        </div>
      </main>
    </div>
  );
}
