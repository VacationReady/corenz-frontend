'use client';

import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function EmployeeSidebar() {
  return (
    <aside className="w-64 bg-neutral-800 text-white min-h-screen p-6 flex flex-col justify-between">
      <nav className="space-y-4">
        <Link href="/dashboard" className="block hover:text-blue-400">Dashboard</Link>
        <Link href="/calendar" className="block hover:text-blue-400">Calendar</Link>
        <Link href="/leave" className="block hover:text-blue-400">My Leave</Link>
        <Link href="/profile" className="block hover:text-blue-400">My Profile</Link>
      </nav>

      <div className="pt-4 border-t border-neutral-700">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-200"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
