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
    <div className="max-w-screen-xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {/* Tasks Panel */}
      <div className="col-span-2 bg-white rounded-2xl shadow-md p-6 flex flex-col justify-between hover:shadow-lg transition-shadow">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center text-blue-800">
              <ClipboardList className="w-5 h-5 mr-2" />
              Tasks
            </h2>
            <Link href="/tasks" className="text-sm text-blue-600 hover:underline flex items-center">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✅ Complete June payroll</li>
            <li>📄 Send onboarding forms to new hires</li>
            <li>📌 Review absence policy update</li>
          </ul>
        </div>
      </div>

      {/* Holiday Balance Panel */}
      <div className="col-span-2 xl:col-span-1 bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center text-green-700">
            <CalendarDays className="w-5 h-5 mr-2" />
            Holiday Balance
          </h2>
          <Link href="/calendar" className="text-sm text-blue-600 hover:underline">
            Calendar
          </Link>
        </div>
        <div className="text-sm text-gray-800 space-y-2">
          <p><strong>Balance:</strong> 25 days</p>
          <p><strong>Used:</strong> 12 days</p>
          <p><strong>Remaining:</strong> 13 days</p>
        </div>
        <Link
          href="/calendar/book"
          className="mt-4 inline-block bg-green-600 text-white text-sm px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
        >
          Book Holiday
        </Link>
      </div>

      {/* Company Documents Panel */}
      <div className="col-span-2 md:col-span-1 bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center text-purple-700">
            <FileText className="w-5 h-5 mr-2" />
            Company Documents
          </h2>
          <Link href="/documents" className="text-sm text-blue-600 hover:underline">
            Go to Documents
          </Link>
        </div>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>📁 Health & Safety Policy.pdf</li>
          <li>📁 Employment Contract.pdf</li>
          <li>📁 Payroll_May_2025.pdf</li>
        </ul>
      </div>

      {/* Company News Panel */}
      <div className="col-span-2 md:col-span-1 bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center text-red-600">
            <Newspaper className="w-5 h-5 mr-2" />
            Company News
          </h2>
          <Link href="/news" className="text-sm text-blue-600 hover:underline">
            More
          </Link>
        </div>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>🚀 New HR portal launches next week</li>
          <li>🎉 Staff BBQ planned for June 21st</li>
          <li>🛠 Maintenance scheduled this Friday at 6PM</li>
        </ul>
      </div>
    </div>
  );
}
