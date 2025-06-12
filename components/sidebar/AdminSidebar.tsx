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
} from "lucide-react";

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => setCollapsed(!collapsed);

  return (
    <div className={`h-screen bg-white shadow-md border-r transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h1 className={`font-bold text-indigo-700 transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>CoreNZ</h1>
        <button onClick={toggleSidebar}>
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>
      <nav className="flex flex-col px-2 pt-4 text-sm text-gray-700 space-y-1">
        <SidebarLink href="/dashboard/admin" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" collapsed={collapsed} />
        <SidebarLink href="/dashboard/approvals" icon={<ClipboardCheck className="w-4 h-4" />} label="Approvals" collapsed={collapsed} />
        <SidebarLink href="/employees" icon={<Users className="w-4 h-4" />} label="Employees" collapsed={collapsed} />
        <SidebarLink href="/calendar" icon={<Calendar className="w-4 h-4" />} label="Calendar" collapsed={collapsed} />
        <SidebarLink href="/documents" icon={<FileText className="w-4 h-4" />} label="Documents" collapsed={collapsed} />
        <SidebarLink href="/org-chart" icon={<Network className="w-4 h-4" />} label="Org Chart" collapsed={collapsed} />
        <SidebarLink href="/surveys" icon={<ClipboardList className="w-4 h-4" />} label="Surveys" collapsed={collapsed} />
        <SidebarLink href="/news" icon={<Megaphone className="w-4 h-4" />} label="News" collapsed={collapsed} />
        <SidebarLink href="/settings" icon={<Settings className="w-4 h-4" />} label="Settings" collapsed={collapsed} />
      </nav>
    </div>
  );
}

function SidebarLink({ href, icon, label, collapsed }: { href: string, icon: React.ReactNode, label: string, collapsed: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 transition-all">
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
