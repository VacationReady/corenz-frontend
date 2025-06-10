"use client";

import {
  CalendarDays,
  ClipboardList,
  FileText,
  Newspaper,
  Users,
  Cake,
  AlertCircle,
  UserPlus,
  Ban,
  Search,
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="w-full min-h-screen bg-neutral-100">
      {/* Top Bar */}
      <div className="w-full bg-neutral-900 text-white px-8 py-4 flex justify-between items-center shadow sticky top-0 z-10">
        <h1 className="text-lg font-semibold">Admin Dashboard</h1>
        <div className="relative w-96">
          <Search className="absolute top-2.5 left-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            defaultValue="Search for people"
            className="w-full bg-neutral-800 text-white placeholder-gray-400 pl-10 pr-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Grid Layout */}
      <div className="px-8 py-10 grid grid-cols-12 gap-6 max-w-screen-2xl mx-auto">
        {/* 1st Row */}
        <DashboardCard title="People Summary" icon={<Users />} colSpan="4">
          <p><strong>Total Employees:</strong> 58</p>
          <p><strong>Active This Week:</strong> 51</p>
          <p><strong>On Leave Today:</strong> 3</p>
        </DashboardCard>

        <DashboardCard title="Tasks" icon={<ClipboardList />} colSpan="4">
          <ul className="space-y-2">
            <li>✅ Complete June payroll</li>
            <li>📄 Send onboarding forms to new hires</li>
            <li>📌 Review absence policy update</li>
          </ul>
          <Link href="/tasks" className="block mt-3 text-sm text-indigo-600 hover:underline">
            View all tasks →
          </Link>
        </DashboardCard>

        <DashboardCard title="Holiday Balance" icon={<CalendarDays />} colSpan="4">
          <p><strong>Annual Entitlement:</strong> 25 days</p>
          <p><strong>Used:</strong> 12 days</p>
          <p><strong>Remaining:</strong> 13 days</p>
          <Link
            href="/calendar/book"
            className="inline-block mt-3 bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700"
          >
            Book Holiday
          </Link>
        </DashboardCard>

        {/* 2nd Row */}
        <DashboardCard title="Upcoming Events" icon={<Cake />} colSpan="4">
          <ul className="space-y-2">
            <li>🎂 Sarah K. — Birthday on June 12th</li>
            <li>🏆 Alex T. — 5 Year Anniversary on June 15th</li>
            <li>🎉 Team Lunch — June 21st @ 12:30PM</li>
          </ul>
        </DashboardCard>

        <DashboardCard title="Company Documents" icon={<FileText />} colSpan="4">
          <ul className="space-y-2">
            <li>📁 Health & Safety Policy.pdf</li>
            <li>📁 Employment Contract.pdf</li>
            <li>📁 Payroll_May_2025.pdf</li>
          </ul>
          <Link href="/documents" className="block mt-3 text-sm text-indigo-600 hover:underline">
            View all documents →
          </Link>
        </DashboardCard>

        <DashboardCard title="Company News" icon={<Newspaper />} colSpan="4">
          <ul className="space-y-2">
            <li>🚀 New HR portal launches next week</li>
            <li>🎉 Staff BBQ planned for June 21st</li>
            <li>🛠 Maintenance scheduled this Friday at 6PM</li>
          </ul>
          <Link href="/news" className="block mt-3 text-sm text-indigo-600 hover:underline">
            View all news →
          </Link>
        </DashboardCard>

        {/* 3rd Row */}
        <DashboardCard title="Absence Summary" icon={<Ban />} colSpan="4">
          <p><strong>Sick Leave (June):</strong> 5 days</p>
          <p><strong>Parental Leave:</strong> 2 employees</p>
          <p><strong>Unplanned Absences:</strong> 3 days</p>
        </DashboardCard>

        <DashboardCard title="New Starters" icon={<UserPlus />} colSpan="4">
          <ul className="space-y-2">
            <li>👤 Emily R. — Marketing Assistant (Starts June 17)</li>
            <li>👤 Liam P. — Sales Exec (Starts June 24)</li>
          </ul>
        </DashboardCard>

        <DashboardCard title="Alerts & Compliance" icon={<AlertCircle />} colSpan="4">
          <ul className="space-y-2">
            <li>⚠️ 2 Right-to-Work documents expiring this month</li>
            <li>🔔 1 overdue probation review</li>
            <li>❗ 3 employee records missing address</li>
          </ul>
        </DashboardCard>
      </div>
    </div>
  );
}

function DashboardCard({ title, icon, children, colSpan }: { title: string; icon: React.ReactNode; children: React.ReactNode; colSpan: string; }) {
  return (
    <div className={`col-span-12 md:col-span-6 xl:col-span-${colSpan} bg-white rounded-2xl shadow p-6 h-full flex flex-col justify-between`}>
      <div>
        <div className="flex items-center mb-4 text-indigo-700">
          <div className="w-6 h-6 mr-2">{icon}</div>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <div className="text-sm text-gray-800 space-y-1">{children}</div>
      </div>
    </div>
  );
}
