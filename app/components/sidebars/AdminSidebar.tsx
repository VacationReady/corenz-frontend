'use client';

import Link from "next/link";
import { useState } from "react";
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  Calendar,
  FileText,
  Network,
  ClipboardList,
  Megaphone,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = () => setCollapsed(!collapsed);

  return (
    <div className={`min-h-screen bg-white shadow-md border-r transition-all duration-300 flex flex-col ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between px-4 py-4 border-b">
        <h1 className={`font-bold text-indigo-700 text-lg transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>CoreNZ</h1>
        <button onClick={toggleSidebar}>
          {collapsed ? <Menu className="w-5 h-5 text-gray-800" /> : <X className="w-5 h-5 text-gray-800" />}
        </button>
      </div>

      <nav className="flex-1 mt-4">
        <ul className="space-y-3 text-sm font-medium px-1 text-gray-900">
          <SidebarLink href="/dashboard/admin" icon={<LayoutDashboard size={18} />} label="Dashboard" collapsed={collapsed} />
          <SidebarLink href="/dashboard/approvals" icon={<ClipboardCheck size={18} />} label="Approvals" collapsed={collapsed} />
          <SidebarLink href="/employees" icon={<Users size={18} />} label="Employees" collapsed={collapsed} />
          <SidebarLink href="/calendar" icon={<Calendar size={18} />} label="Calendar" collapsed={collapsed} />
          <SidebarLink href="/documents" icon={<FileText size={18} />} label="Documents" collapsed={collapsed} />
          <SidebarLink href="/org-chart" icon={<Network size={18} />} label="Org Chart" collapsed={collapsed} />
          <SidebarLink href="/surveys" icon={<ClipboardList size={18} />} label="Surveys" collapsed={collapsed} />
          <SidebarLink href="/news" icon={<Megaphone size={18} />} label="News" collapsed={collapsed} />
          <SidebarLink href="/settings" icon={<Settings size={18} />} label="Settings" collapsed={collapsed} />
        </ul>
      </nav>

      <div className="px-4 py-3 border-t">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 text-sm text-red-600 hover:text-red-800"
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  collapsed,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 transition-all text-gray-900"
      >
        {icon}
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    </li>
  );
}