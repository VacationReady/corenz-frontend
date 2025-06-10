"use client";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Newspaper,
  Users,
  Cake,
  UserPlus,
  ShieldAlert,
  Ban,
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="w-full min-h-screen bg-neutral-100 pt-14">
      {/* Fixed Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-neutral-900 text-white flex items-center justify-between px-6 z-50">
        <h1 className="text-lg font-semibold">Admin Dashboard</h1>
        <input
          type="text"
          defaultValue="Search for people"
          className="bg-neutral-800 text-white placeholder-gray-400 px-4 py-2 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Dashboard Grid */}
      <div className="px-8 py-8 grid grid-cols-12 gap-6 max-w-screen-2xl mx-auto">

        {/* People Summary */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4 bg-white rounded-2xl shadow p-6">
          <div className="flex items-center mb-4 text-indigo-700">
            <Users className="w-6 h-6 mr-2" />
            <h2 className="text-lg font-semibold">People Summary</h2>
          </div>
          <div className="text-gray-700 space-y-2 text-sm">
            <p><strong>Total Employees:</strong> 58</p>
            <p><strong>Active This Week:</strong> 51</p>
            <p><strong>On Leave Today:</strong> 3</p>
          </div>
        </div>

        {/* Tasks */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4 bg-white rounded-2xl shadow p-6">
          <div className="flex items-center mb-4 text-indigo-700">
            <ClipboardList className="w-6 h-6 mr-2" />
            <h2 className="text-lg font-semibold">Tasks</h2>
          </div>
          <ul className="text-sm text-gray-800 space-y-2">
            <li>✅ Complete June payroll</li>
            <li>📄 Send onboarding forms to new hires</li>
            <li>📌 Review absence policy update</li>
          </ul>
          <Link href="/tasks" className="block mt-4 text-sm text-indigo-600 hover:underline">
            View all tasks →
          </Link>
        </div>

        {/* Holiday Balance */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4 bg-white rounded-2xl shadow p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center mb-4 text-indigo-700">
              <CalendarDays className="w-6 h-6 mr-2" />
              <h2 className="text-lg font-semibold">Holiday Balance</h2>
            </div>
            <div className="text-sm text-gray-800 space-y-1">
              <p><strong>Annual Entitlement:</strong> 25 days</p>
              <p><strong>Used:</strong> 12 days</p>
              <p><strong>Remaining:</strong> 13 days</p>
            </div>
          </div>
          <Link
            href="/calendar/book"
            className="mt-4 inline-block bg-indigo-600 text-white text-sm px-4 py-2 rounded hover:bg-indigo-700 transition"
          >
            Book Holiday
          </Link>
        </div>

        {/* Upcoming Events */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4 bg-white rounded-2xl shadow p-6">
          <div className="flex items-center mb-4 text-indigo-700">
            <Cake className="w-6 h-6 mr-2" />
            <h2 className="text-lg font-semibold">Upcoming Events</h2>
          </div>
          <ul className="text-sm text-gray-800 space-y-2">
            <li>🎂 Sarah K. — Birthday on June 12th</li>
            <li>🏆 Alex T. — 5 Year Anniversary on June 15th</li>
            <li>🎉 Team Lunch — June 21st @ 12:30PM</li>
          </ul>
        </div>

        {/* Company Documents */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4 bg-white rounded-2xl shadow p-6">
          <div className="flex items-center mb-4 text-indigo-700">
            <FileText className="w-6 h-6 mr-2" />
            <h2 className="text-lg font-semibold">Company Documents</h2>
          </div>
          <ul className="text-sm text-gray-800 space-y-2">
            <li>📁 Health & Safety Policy.pdf</li>
            <li>📁 Employment Contract.pdf</li>
            <li>📁 Payroll_May_2025.pdf</li>
          </ul>
          <Link href="/documents" className="block mt-4 text-sm text-indigo-600 hover:underline">
            View all documents →
          </Link>
        </div>

        {/* Company News */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4 bg-white rounded-2xl shadow p-6">
          <div className="flex items-center mb-4 text-indigo-700">
            <Newspaper className="w-6 h-6 mr-2" />
            <h2 className="text-lg font-semibold">Company News</h2>
          </div>
          <ul className="text-sm text-gray-800 space-y-2">
            <li>🚀 New HR portal launches next week</li>
            <li>🎉 Staff BBQ planned for June 21st</li>
            <li>🛠 Maintenance scheduled this Friday at 6PM</li>
          </ul>
          <Link href="/news" className="block mt-4 text-sm text-indigo-600 hover:underline">
            View all news →
          </Link>
        </div>

        {/* Absence Summary */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4 bg-white rounded-2xl shadow p-6">
          <div className="flex items-center mb-4 text-indigo-700">
            <Ban className="w-6 h-6 mr-2" />
            <h2 className="text-lg font-semibold">Absence Summary</h2>
          </div>
          <div className="text-sm text-gray-800 space-y-1">
            <p><strong>Sick Leave (June):</strong> 5 days</p>
            <p><strong>Parental Leave:</strong> 2 employees</p>
            <p><strong>Unplanned Absences:</strong> 3 days</p>
          </div>
        </div>

        {/* New Starters */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4 bg-white rounded-2xl shadow p-6">
          <div className="flex items-center mb-4 text-indigo-700">
            <UserPlus className="w-6 h-6 mr-2" />
            <h2 className="text-lg font-semibold">New Starters</h2>
          </div>
          <ul className="text-sm text-gray-800 space-y-2">
            <li>👤 Emily R. — Marketing Assistant (Starts June 17)</li>
            <li>👤 Liam P. — Sales Exec (Starts June 24)</li>
          </ul>
        </div>

        {/* Compliance Alerts */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4 bg-white rounded-2xl shadow p-6">
          <div className="flex items-center mb-4 text-indigo-700">
            <ShieldAlert className="w-6 h-6 mr-2" />
            <h2 className="text-lg font-semibold">Alerts & Compliance</h2>
          </div>
          <ul className="text-sm text-red-600 space-y-2">
            <li>⚠️ Right-to-work expiry: Maria J. (June 15)</li>
            <li>📌 Probation review overdue: Joe D.</li>
            <li>📝 Missing emergency contact: Aimee S.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
