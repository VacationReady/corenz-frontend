"use client";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Newspaper,
  Users,
  Cake,
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="w-full px-8 py-10 min-h-[90vh] bg-gray-50">
      <div className="grid grid-cols-12 gap-6 max-w-screen-2xl mx-auto">

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

      </div>
    </div>
  );
}
