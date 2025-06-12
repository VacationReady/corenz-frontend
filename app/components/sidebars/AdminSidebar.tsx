"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  CheckCircle,
  Users,
  FileBarChart,
  CalendarDays,
  Folder,
  Megaphone,
  Settings,
  Newspaper,
} from "lucide-react";

export default function AdminSidebar() {
  return (
    <aside className="w-64 bg-neutral-900 text-white min-h-screen shadow-lg p-6">
      <div className="mb-8 text-2xl font-bold tracking-wide">CoreNZ</div>
      <nav>
        <ul className="space-y-4 text-sm font-medium">
          <li>
            <Link href="/dashboard" className="flex items-center gap-2 hover:text-gray-300">
              <LayoutDashboard size={18} /> Dashboard
            </Link>
          </li>
          <li>
            <Link href="/approvals" className="flex items-center gap-2 hover:text-gray-300">
              <CheckCircle size={18} /> Approvals
            </Link>
          </li>
          <li>
            <Link href="/employees" className="flex items-center gap-2 hover:text-gray-300">
              <Users size={18} /> Employees
            </Link>
          </li>
          <li>
            <Link href="/reports" className="flex items-center gap-2 hover:text-gray-300">
              <FileBarChart size={18} /> Reports
            </Link>
          </li>
          <li>
            <Link href="/calendar" className="flex items-center gap-2 hover:text-gray-300">
              <CalendarDays size={18} /> Calendar
            </Link>
          </li>
          <li>
            <Link href="/documents" className="flex items-center gap-2 hover:text-gray-300">
              <Folder size={18} /> Documents
            </Link>
          </li>
          <li>
            <Link href="/surveys" className="flex items-center gap-2 hover:text-gray-300">
              <Megaphone size={18} /> Surveys
            </Link>
          </li>
          <li>
            <Link href="/news" className="flex items-center gap-2 hover:text-gray-300">
              <Newspaper size={18} /> News
            </Link>
          </li>
          <li>
            <Link href="/settings" className="flex items-center gap-2 hover:text-gray-300">
              <Settings size={18} /> Settings
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
