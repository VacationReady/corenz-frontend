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

interface SidebarProps {
  variant?: "desktop" | "mobile";
  onMobileNavigate?: () => void;
  onMobileClose?: () => void;
}

export default function AdminSidebar({
  variant = "desktop",
  onMobileNavigate,
  onMobileClose,
}: SidebarProps) {
  const { branding } = useTenantBranding();
  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = () => setCollapsed(!collapsed);
  const pathname = usePathname();
  const isMobile = variant === "mobile";
  const headerPadding = isMobile ? "px-6 py-6" : "px-8 py-8";
  const sectionPadding = isMobile ? "px-6 py-5" : "px-8 py-6";
  const navPadding = isMobile ? "px-4" : "px-6";

  const brandName = branding.shortName || branding.name;
  const brandLogo = branding.squareLogoUrl || branding.logoUrl || null;

  const handleLogout = () => {
    onMobileNavigate?.();
    void signOut({ callbackUrl: "/login" });
  };

  return (
    <div
      className={clsx(
        "transition-all duration-300 flex flex-col",
        isMobile ? "h-full w-full max-w-sm p-4" : "min-h-screen m-4 ml-6",
        isMobile ? "w-full" : collapsed ? "w-16" : "w-80",
      )}
    >
      {/* Glassmorphism Container */}
      <div className="glass rounded-3xl shadow-glass h-full flex flex-col overflow-hidden">
        {/* Logo Section */}
        <div
          className={clsx(
            "flex items-center justify-between border-b border-glass",
            headerPadding,
          )}
        >
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
          {isMobile && onMobileClose ? (
            <button
              onClick={onMobileClose}
              className="p-3 hover-glass rounded-2xl transition-glass"
            >
              <X className="w-6 h-6 text-foreground" />
              <span className="sr-only">Close navigation</span>
            </button>
          ) : (
            <button
              onClick={toggleSidebar}
              className="p-3 hover-glass rounded-2xl transition-glass"
            >
              {collapsed ? (
                <Menu className="w-6 h-6 text-foreground" />
              ) : (
                <X className="w-6 h-6 text-foreground" />
              )}
              <span className="sr-only">Toggle sidebar width</span>
            </button>
          )}
        </div>

        {/* Quick Actions Header */}
        {!collapsed && (
          <div className={clsx("space-y-1", sectionPadding)}>
            <h2 className="text-lg font-bold text-foreground mb-2">
              Quick actions
            </h2>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              Navigate your workspace
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/80 border border-glass rounded-md px-1.5 py-0.5">
                <kbd className="font-mono">Ctrl</kbd>
                <span>+</span>
                <kbd className="font-mono">K</kbd>
              </span>
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav
          className={clsx(
            "flex-1 pb-6",
            navPadding,
            isMobile && "overflow-y-auto",
          )}
        >
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
                    onNavigate={onMobileNavigate}
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
                    onNavigate={onMobileNavigate}
                  />
                ))}
              </ul>
            </div>
          </div>
        </nav>

        {/* Settings & Logout */}
        <div
          className={clsx(
            "border-t border-glass",
            isMobile ? "px-6 py-5" : "px-6 py-6",
          )}
        >
          <button
            onClick={handleLogout}
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
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  active: boolean;
  onNavigate?: () => void;
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
        onClick={() => onNavigate?.()}
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
