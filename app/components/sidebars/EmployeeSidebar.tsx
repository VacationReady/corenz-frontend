"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, LayoutDashboard, Calendar, Clock, Users, X, Target, ClipboardList, CalendarClock, FileText } from "lucide-react";
import { signOut } from "next-auth/react";
import { getLogoutCallbackUrl } from "@/lib/logout-url";
import clsx from "clsx";
import { useTenantBranding } from "@/components/TenantBrandingProvider";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

interface SidebarProps {
  variant?: "desktop" | "mobile";
  onMobileNavigate?: () => void;
  onMobileClose?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactElement;
}

export default function EmployeeSidebar({
  variant = "desktop",
  onMobileNavigate,
  onMobileClose,
}: SidebarProps) {
  const { branding } = useTenantBranding();
  const { filterNavItems } = useFeatureToggles();
  const pathname = usePathname();
  const isMobile = variant === "mobile";
  const headerPadding = isMobile ? "px-4 py-4" : "px-4 py-4";
  const sectionPadding = isMobile ? "px-4 py-3" : "px-4 py-3";
  const navPadding = isMobile ? "px-2" : "px-2";

  const brandName = branding.shortName || branding.name;

  const handleLogout = () => {
    onMobileNavigate?.();
    void signOut({ callbackUrl: getLogoutCallbackUrl() });
  };

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard size={18} />,
    },
    { label: "Employees", href: "/employees", icon: <Users size={18} /> },
    { label: "Calendar", href: "/calendar", icon: <Calendar size={18} /> },
    { label: "My Timesheet", href: "/employee/timesheet", icon: <ClipboardList size={18} /> },
    { label: "My Schedule", href: "/employee/schedule", icon: <CalendarClock size={18} /> },
    { label: "My Performance", href: "/performance", icon: <Target size={18} /> },
    { label: "Documents", href: "/documents", icon: <FileText size={18} /> },
  ];

  // Filter navigation items based on feature toggles
  const filteredNavItems = useMemo(
    () => filterNavItems(navItems),
    [filterNavItems]
  );

  return (
    <div
      className={clsx(
        "transition-all duration-300 flex flex-col",
        isMobile ? "h-full w-full max-w-sm p-2" : "h-full p-2 w-[13rem]",
      )}
    >
      {/* Glassmorphism Container */}
      <div className="glass rounded-2xl shadow-glass h-full flex flex-col overflow-hidden">
        {/* Logo Section */}
        <div className={clsx("border-b border-glass", headerPadding)}>
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              onClick={() => onMobileNavigate?.()}
              className="flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Go to PeopleCore dashboard"
            >
              <h2 className="text-base font-bold text-foreground">PeopleCore</h2>
            </Link>
            {isMobile && onMobileClose && (
              <button
                onClick={onMobileClose}
                className="p-2 hover-glass rounded-xl transition-glass"
              >
                <X className="h-5 w-5 text-foreground" />
                <span className="sr-only">Close navigation</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions Header */}
        <div className={clsx(sectionPadding)}>
          <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Navigation
          </h2>
        </div>

        {/* Navigation */}
        <nav
          className={clsx(
            "flex-1 pb-2",
            navPadding,
            isMobile && "overflow-y-auto",
          )}
        >
          <div className="space-y-0.5">
            {filteredNavItems.map(({ label, href, icon }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-glass",
                  pathname === href
                    ? "bg-primary text-primary-foreground shadow-warm"
                    : "text-foreground sidebar-hover-gradient",
                )}
                onClick={() => onMobileNavigate?.()}
              >
                <div className="w-4 h-4">
                  {React.cloneElement(icon, { size: 16 })}
                </div>
                <span className="truncate font-medium text-sm">{label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Settings & Logout */}
        <div
          className={clsx(
            "border-t border-glass",
            isMobile ? "px-2 py-3" : "px-2 py-2",
          )}
        >
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-destructive sidebar-hover-gradient rounded-lg transition-glass"
          >
            <LogOut size={16} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
