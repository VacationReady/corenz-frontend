import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LeaveBalanceWidget from "@/components/dashboard/LeaveBalanceWidget";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import {
  Search,
  Bell,
  ChevronDown,
  ClipboardList,
  Users,
  Megaphone,
  Filter,
  FileText,
  FilePlus2,
  Mail,
  CalendarCheck2,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return <div className="p-6">You must be logged in to view this page.</div>;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });

  if (!user?.employee) {
    return <div className="p-6">No employee record found for your user.</div>;
  }

  const employeeId = user.employee.id;

  const headcountData = [
    { month: "Jul", employees: 40, leavers: 1, starters: 2 },
    { month: "Aug", employees: 41, leavers: 0, starters: 1 },
    { month: "Sep", employees: 42, leavers: 1, starters: 2 },
    { month: "Oct", employees: 42, leavers: 0, starters: 1 },
    { month: "Nov", employees: 43, leavers: 0, starters: 2 },
    { month: "Dec", employees: 43, leavers: 1, starters: 1 },
    { month: "Jan", employees: 44, leavers: 0, starters: 3 },
    { month: "Feb", employees: 44, leavers: 1, starters: 1 },
    { month: "Mar", employees: 45, leavers: 0, starters: 2 },
    { month: "Apr", employees: 45, leavers: 0, starters: 1 },
    { month: "May", employees: 46, leavers: 0, starters: 2 },
    { month: "Jun", employees: 46, leavers: 0, starters: 1 },
  ];

  const turnoverData = headcountData.map((item) => ({
    month: item.month,
    turnover: ((item.leavers / item.employees) * 100).toFixed(1),
  }));

  const startersData = headcountData.map((item) => ({
    month: item.month,
    starters: item.starters,
  }));

  const peopleOffData = {
    Today: [
      { name: "John Doe", reason: "Annual Leave", initials: "JD", color: "bg-green-500" },
      { name: "Jane Smith", reason: "Sick Leave", initials: "JS", color: "bg-red-500" },
    ],
    "This Week": [
      { name: "John Doe", reason: "Annual Leave", initials: "JD", color: "bg-green-500" },
      { name: "Jane Smith", reason: "Sick Leave", initials: "JS", color: "bg-red-500" },
      { name: "Alice Brown", reason: "Maternity Leave", initials: "AB", color: "bg-pink-500" },
    ],
    "This Month": [
      { name: "John Doe", reason: "Annual Leave", initials: "JD", color: "bg-green-500" },
      { name: "Jane Smith", reason: "Sick Leave", initials: "JS", color: "bg-red-500" },
      { name: "Alice Brown", reason: "Maternity Leave", initials: "AB", color: "bg-pink-500" },
      { name: "Michael Green", reason: "Training", initials: "MG", color: "bg-blue-500" },
    ],
  };

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
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">3</span>
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
        {/* ✅ Live Leave Balance & Booking */}
        <LeaveBalanceWidget employeeId={employeeId} />

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
                <span className="text-xs text-gray-700 dark:text-gray-300">{action.label}</span>
              </button>
            ))}
          </div>
        </DashboardWidget>

        {/* People Metrics */}
        <DashboardWidget title="People Metrics" icon={Users} className="h-full">
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <li>Active Employees: <span className="font-semibold">46</span></li>
            <li>Managers: <span className="font-semibold">5</span></li>
            <li>New Starters This Month: <span className="font-semibold">3</span></li>
          </ul>
        </DashboardWidget>

        {/* Pending Approvals */}
        <DashboardWidget title="Pending Approvals" icon={ClipboardList} className="h-full">
          <p className="text-4xl font-bold text-indigo-700 dark:text-indigo-300">7</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Awaiting your approval</p>
        </DashboardWidget>

        {/* Headcount & Turnover */}
        <DashboardWidget
          title="Headcount & Turnover"
          icon={Users}
          className="h-full"
        >
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={headcountData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="employees" stroke="#6366f1" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </DashboardWidget>

        {/* Who's Off */}
        <DashboardWidget title="Who's Off" icon={CalendarCheck2} className="h-full">
          {peopleOffData["Today"].map((person, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 mb-1">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full ${person.color} flex items-center justify-center text-white text-xs font-semibold`}>
                  {person.initials}
                </div>
                <span>{person.name}</span>
              </div>
              <span className="text-gray-500 dark:text-gray-400">{person.reason}</span>
            </div>
          ))}
        </DashboardWidget>
      </main>
    </div>
  );
}
