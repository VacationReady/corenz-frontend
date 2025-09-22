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
import { useTenantBranding } from "@/components/TenantBrandingProvider";

export default function AdminSidebar() {
  const { branding } = useTenantBranding();
  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = () => setCollapsed(!collapsed);
  const pathname = usePathname();
  const brandName = branding.shortName || branding.name;
  const brandLogo = branding.squareLogoUrl || branding.logoUrl || null;

  return (
    <div
      className={clsx(
        "min-h-screen transition-all duration-300 flex flex-col m-4 ml-6",
        collapsed ? "w-16" : "w-80",
      )}
    >
      {/* Glassmorphism Container */}
      <div className="glass rounded-3xl shadow-glass h-full flex flex-col overflow-hidden">
        {/* Logo Section */}
        <div className="flex items-center justify-between px-8 py-8 border-b border-glass">
          <div
            className={clsx(
              "flex items-center transition-opacity duration-200",
              collapsed ? "opacity-0 w-0" : "opacity-100",
            )}
          >
            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center mr-4 shadow-warm overflow-hidden">
              {brandLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brandLogo}
                  alt={`${brandName} logo`}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <span className="text-primary-foreground font-bold text-lg">
                  {branding.initials}
                </span>
              )}
            </div>
            <h1 className="font-bold text-foreground text-2xl">{brandName}</h1>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-3 hover-glass rounded-2xl transition-glass"
          >
            {collapsed ? (
              <Menu className="w-6 h-6 text-foreground" />
            ) : (
              <X className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Quick Actions Header */}
        {!collapsed && (
          <div className="px-8 py-6">
            <h2 className="text-lg font-bold text-foreground mb-2">
              Quick actions
            </h2>
            <p className="text-sm text-muted-foreground">
              Navigate your workspace
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-6 pb-6">
          <div className="space-y-8">
            {/* Core Section */}
            <div>
              {!collapsed && (
                <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Core
                </h3>
              )}
              <ul className="space-y-2">
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
                <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  HR Tools
                </h3>
              )}
              <ul className="space-y-2">
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
        <div className="border-t border-glass px-6 py-6">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-destructive hover-glass rounded-2xl transition-glass"
          >
            <LogOut size={20} />
            {!collapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
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
          "flex items-center gap-4 px-4 py-3 rounded-2xl transition-glass relative group",
          "hover-glass",
          active
            ? "bg-primary text-primary-foreground shadow-warm"
            : "text-foreground",
        )}
      >
        <div className="flex-shrink-0 w-6 h-6">{icon}</div>
        {!collapsed && (
          <span className="truncate font-medium text-base">{label}</span>
        )}
        {collapsed && (
          <div className="absolute left-full ml-4 px-3 py-2 glass rounded-2xl shadow-glass opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            <span className="text-sm font-medium text-foreground">{label}</span>
          </div>
        )}
      </Link>
    </li>
  );
}

const coreLinks = [
  {
    href: "/dashboard/admin",
    icon: <LayoutDashboard size={24} />,
    label: "Dashboard",
  },
  {
    href: "/dashboard/approvals",
    icon: <ClipboardCheck size={24} />,
    label: "Approvals",
  },
  { href: "/employees", icon: <Users size={24} />, label: "Employees" },
  { href: "/calendar", icon: <Calendar size={24} />, label: "Calendar" },
];

const hrToolsLinks = [
  { href: "/documents", icon: <FileText size={24} />, label: "Documents" },
  { href: "/reports", icon: <BarChart3 size={24} />, label: "Reports" },
  { href: "/org-chart", icon: <Network size={24} />, label: "Org Chart" },
  { href: "/news", icon: <Megaphone size={24} />, label: "News" },
  { href: "/settings", icon: <Settings size={24} />, label: "Settings" },
];
