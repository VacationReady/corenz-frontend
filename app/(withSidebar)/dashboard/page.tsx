"use client";
import { CalendarDays, FileText, Newspaper, ClipboardList } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Tasks Panel */}
      <div className="bg-white rounded-xl shadow-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <ClipboardList className="w-5 h-5 mr-2 text-blue-600" /> Tasks
          </h2>
          <Link href="/tasks" className="text-blue-600 hover:underline text-sm">View all</Link>
        </div>
        <ul className="text-sm space-y-2 text-gray-700">
          <li>✅ Complete June payroll</li>
          <li>📄 Send onboarding forms to new hires</li>
          <li>📌 Review absence policy update</li>
        </ul>
      </div>

      {/* Holiday Summary Panel */}
      <div className="bg-white rounded-xl shadow-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <CalendarDays className="w-5 h-5 mr-2 text-green-600" /> Holiday Balance
          </h2>
          <Link href="/calendar" className="text-blue-600 hover:underline text-sm">Calendar</Link>
        </div>
        <div className="text-gray-700 text-sm space-y-2">
          <p><strong>Balance:</strong> 25 days</p>
          <p><strong>Used:</strong> 12 days</p>
          <p><strong>Remaining:</strong> 13 days</p>
        </div>
        <Link href="/calendar/book" className="mt-4 inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm">
          Book Holiday
        </Link>
      </div>

      {/* Documents Panel */}
      <div className="bg-white rounded-xl shadow-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <FileText className="w-5 h-5 mr-2 text-purple-600" /> Company Documents
          </h2>
          <Link href="/documents" className="text-blue-600 hover:underline text-sm">Go to Documents</Link>
        </div>
        <ul className="text-sm text-gray-700">
          <li>📁 Health & Safety Policy.pdf</li>
          <li>📁 Employment Contract.pdf</li>
          <li>📁 Payroll_May_2025.pdf</li>
        </ul>
      </div>

      {/* Company News Panel */}
      <div className="bg-white rounded-xl shadow-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <Newspaper className="w-5 h-5 mr-2 text-red-600" /> Company News
          </h2>
          <Link href="/news" className="text-blue-600 hover:underline text-sm">More</Link>
        </div>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>🚀 New HR portal launches next week</li>
          <li>🎉 Staff BBQ planned for June 21st</li>
          <li>🛠 Scheduled maintenance this Friday at 6PM</li>
        </ul>
      </div>
    </div>
  );
}
