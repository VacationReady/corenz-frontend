"use client";

import { CalendarDays, ClipboardList, FileText, Newspaper, Users, Cake, UserPlus, ShieldAlert, Ban } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

export default function AdminDashboardPage() {
  return (
    <div className="w-full min-h-screen bg-neutral-100 pt-14">
      {/* Fixed Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-neutral-900 text-white flex items-center justify-between px-6 z-50">
        <h1 className="text-lg font-semibold">Admin Dashboard</h1>
        <div className="w-72">
          <Input placeholder="Search for people" />
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="px-8 py-8 grid grid-cols-12 gap-6 max-w-screen-2xl mx-auto">
        {/* People Summary */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <Card title="People Summary" icon={<Users className="text-indigo-700" />}>
            <p><strong>Total Employees:</strong> 58</p>
            <p><strong>Active This Week:</strong> 51</p>
            <p><strong>On Leave Today:</strong> 3</p>
          </Card>
        </div>

        {/* Tasks */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <Card title="Tasks" icon={<ClipboardList className="text-indigo-700" />}>
            <ul className="space-y-1">
              <li>✅ Complete June payroll</li>
              <li>📄 Send onboarding forms</li>
              <li>📌 Review absence policy</li>
            </ul>
            <Link href="/tasks" className="block mt-4 text-sm text-indigo-600 hover:underline">
              View all tasks →
            </Link>
          </Card>
        </div>

        {/* Holiday Balance */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <Card title="Holiday Balance" icon={<CalendarDays className="text-indigo-700" />}>
            <p><strong>Annual Entitlement:</strong> 25 days</p>
            <p><strong>Used:</strong> 12 days</p>
            <p><strong>Remaining:</strong> 13 days</p>
            <Link href="/calendar/book" className="inline-block mt-4 text-sm text-white bg-indigo-600 px-4 py-2 rounded hover:bg-indigo-700 transition">
              Book Holiday
            </Link>
          </Card>
        </div>

        {/* Upcoming Events */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <Card title="Upcoming Events" icon={<Cake className="text-indigo-700" />}>
            <p>🎂 Sarah K. — Birthday (June 12)</p>
            <p>🏆 Alex T. — 5 Years (June 15)</p>
            <p>🎉 Team Lunch — June 21 @ 12:30PM</p>
          </Card>
        </div>

        {/* Documents */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <Card title="Company Documents" icon={<FileText className="text-indigo-700" />}>
            <p>📁 Health & Safety Policy.pdf</p>
            <p>📁 Employment Contract.pdf</p>
            <p>📁 Payroll_May_2025.pdf</p>
            <Link href="/documents" className="block mt-4 text-sm text-indigo-600 hover:underline">
              View all documents →
            </Link>
          </Card>
        </div>

        {/* News */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <Card title="Company News" icon={<Newspaper className="text-indigo-700" />}>
            <p>🚀 HR portal launches next week</p>
            <p>🎉 Staff BBQ on June 21</p>
            <p>🛠 Maintenance Friday 6PM</p>
            <Link href="/news" className="block mt-4 text-sm text-indigo-600 hover:underline">
              View all news →
            </Link>
          </Card>
        </div>

        {/* Absence Summary */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <Card title="Absence Summary" icon={<Ban className="text-indigo-700" />}>
            <p><strong>Sick Leave:</strong> 5 days</p>
            <p><strong>Parental Leave:</strong> 2 employees</p>
            <p><strong>Unplanned Absences:</strong> 3</p>
          </Card>
        </div>

        {/* New Starters */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <Card title="New Starters" icon={<UserPlus className="text-indigo-700" />}>
            <p>👤 Emily R. — Marketing (June 17)</p>
            <p>👤 Liam P. — Sales (June 24)</p>
          </Card>
        </div>

        {/* Alerts */}
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <Card title="Alerts & Compliance" icon={<ShieldAlert className="text-indigo-700" />}>
            <p className="text-red-600">⚠️ Right-to-work expiry: Maria J. (June 15)</p>
            <p className="text-red-600">📌 Probation review overdue: Joe D.</p>
            <p className="text-red-600">📝 Missing contact: Aimee S.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}