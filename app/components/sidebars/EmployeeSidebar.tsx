// app/components/sidebars/EmployeeSidebar.tsx
"use client";

import Link from "next/link";

export default function EmployeeSidebar() {
  return (
    <aside className="w-64 bg-neutral-800 text-white min-h-screen p-6">
      <nav className="space-y-4">
        <Link href="/dashboard" className="block hover:text-blue-400">Dashboard</Link>
        <Link href="/calendar" className="block hover:text-blue-400">Calendar</Link>
        <Link href="/leave" className="block hover:text-blue-400">My Leave</Link>
        <Link href="/profile" className="block hover:text-blue-400">My Profile</Link>
      </nav>
    </aside>
  );
}
