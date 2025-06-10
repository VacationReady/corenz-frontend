"use client";
import {
  CalendarDays,
  FileText,
  Newspaper,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="w-full px-8 py-10 min-h-[90vh] bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="grid grid-cols-12 gap-6">

        {/* Tasks */}
        <div className="col-span-12 xl:col-span-6 bg-gradient-to-br from-indigo-50 to-white border-l-4 border-indigo-400 rounded-2xl shadow p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center text-indigo-800">
              <ClipboardList className="w-5 h-5 mr-2" />
              Tasks
            </h2>
            <Link href="/tasks" className="text-sm text-indigo-600 hover:underline flex items-center">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <ul className="space-y-3 text-base text-gray-800">
            <li>✅ Complete June payroll</li>
            <li>📄 Send onboarding forms to new hires</li>
            <li>📌 Review absence policy update</li>
          </ul>
        </div>

        {/* Holiday Balance */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3 bg-gradient-to-br from-emerald-50 to-white border-l-4 border-emerald-400 rounded-2xl shadow p-6 flex flex-col justify-between hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center text-emerald-800">
              <CalendarDays className="w-5 h-5 mr-2" />
              Holiday Balance
            </h2>
            <Link href="/calendar" className="text-sm text-emerald-600 hover:underline">
              Calendar
            </Link>
          </div>
          <div className="text-base text-gray-800 space-y-2">
            <p><strong>Balance:</strong> 25 days</p>
            <p><strong>Used:</strong> 12 days</p>
            <p><strong>Remaining:</strong> 13 days</p>
          </div>
          <Link
            href="/calendar/book"
            className="mt-4 inline-block bg-emerald-600 text-white text-sm px-4 py-2 rounded hover:bg-emerald-700"
          >
            Book Holiday
          </Link>
        </div>

        {/* Company Documents */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-3 bg-gradient-to-br from-violet-50 to-white border-l-4 border-violet-400 rounded-2xl shadow p-6 flex flex-col justify-between hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center text-violet-800">
              <FileText className="w-5 h-5 mr-2" />
              Documents
            </h2>
            <Link href="/documents" className="text-sm text-violet-600 hover:underline">
              View
            </Link>
          </div>
          <ul className="text-base text-gray-800 space-y-2">
            <li>📁 Health & Safety Policy.pdf</li>
            <li>📁 Employment Contract.pdf</li>
            <li>📁 Payroll_May_2025.pdf</li>
          </ul>
        </div>

        {/* Company News */}
        <div className="col-span-12 xl:col-span-6 bg-gradient-to-br from-rose-50 to-white border-l-4 border-rose-400 rounded-2xl shadow p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center text-rose-800">
              <Newspaper className="w-5 h-5 mr-2" />
              Company News
            </h2>
            <Link href="/news" className="text-sm text-rose-600 hover:underline">
              More
            </Link>
          </div>
          <ul className="text-base text-gray-800 space-y-3">
            <li>🚀 New HR portal launches next week</li>
            <li>🎉 Staff BBQ planned for June 21st</li>
            <li>🛠 Maintenance scheduled this Friday at 6PM</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
