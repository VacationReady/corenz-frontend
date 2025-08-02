"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import clsx from "clsx";
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  Calendar,
  FileText,
  Network,
  Megaphone,
  Settings,
  Menu,
  BarChart3,
  X,
  LogOut,
} from "lucide-react";

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = () => setCollapsed(!collapsed);
  const pathname = usePathname();

  return (
    <div
      className={clsx(
        "min-h-screen shadow-enterprise border-r border-enhanced transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-72",
        "bg-content-panel"
      )}
    >
      {/* Logo Section */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-enhanced bg-card-header">
        <div
          className={clsx(
            "flex items-center transition-opacity duration-200",
            collapsed ? "opacity-0 w-0" : "opacity-100"
          )}
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
            <span className="text-primary-foreground font-bold text-sm">C</span>
          </div>
          <h1 className="font-bold text-foreground text-xl">CoreNZ</h1>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-accent rounded-md transition-smooth"
        >
          {collapsed ? (
            <Menu className="w-5 h-5 text-foreground" />
          ) : (
            <X className="w-5 h-5 text-foreground" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6">
        <div className="px-4 space-y-8">
          {/* Core Section */}
          <div>
            {!collapsed && (
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Core
              </h3>
            )}
            <ul className="space-y-1">
              {coreLinks.map((link) => (
                <SidebarLink
                  key={link.href}
                  href={link.href}
                  icon={link.icon}
                  label={link.label}
                  collapsed={collapsed}
                  active={pathname === link.href}
                />
              ))}
            </ul>
          </div>

          {/* HR Tools Section */}
          <div>
            {!collapsed && (
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                HR Tools
              </h3>
            )}
            <ul className="space-y-1">
              {hrToolsLinks.map((link) => (
                <SidebarLink
                  key={link.href}
                  href={link.href}
                  icon={link.icon}
                  label={link.label}
                  collapsed={collapsed}
                  active={pathname === link.href}
                />
              ))}
            </ul>
          </div>
        </div>
      </nav>

      {/* Settings & Logout */}
      <div className="border-t border-enhanced bg-card-header px-4 py-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-smooth"
        >
          <LogOut size={18} />
          {!collapsed && <span className="font-medium">Logout</span>}
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
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  active: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={clsx(
          "flex items-center gap-3 px-3 py-2.5 rounded-md transition-smooth relative group",
          "hover:bg-accent hover:text-accent-foreground",
          active
            ? "bg-primary text-primary-foreground shadow-sm border-l-4 border-primary-foreground/20"
            : "text-foreground"
        )}
      >
        <div className="flex-shrink-0">{icon}</div>
        {!collapsed && <span className="truncate font-medium text-sm">{label}</span>}
        {collapsed && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            {label}
          </div>
        )}
      </Link>
    </li>
  );
}

const coreLinks = [
  { href: "/dashboard/admin", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { href: "/dashboard/approvals", icon: <ClipboardCheck size={18} />, label: "Approvals" },
  { href: "/employees", icon: <Users size={18} />, label: "Employees" },
  { href: "/calendar", icon: <Calendar size={18} />, label: "Calendar" },
];

const hrToolsLinks = [
  { href: "/documents", icon: <FileText size={18} />, label: "Documents" },
  { href: "/reports", icon: <BarChart3 size={18} />, label: "Reports" },
  { href: "/org-chart", icon: <Network size={18} />, label: "Org Chart" },
  { href: "/news", icon: <Megaphone size={18} />, label: "News" },
  { href: "/settings", icon: <Settings size={18} />, label: "Settings" },
];
