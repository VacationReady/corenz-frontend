"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogOut, X, LayoutDashboard, Calendar, Users as UsersIcon, Target, ClipboardList, CalendarClock, GitCompare, Network, FileText } from "lucide-react";
import { signOut } from "next-auth/react";
import { getLogoutCallbackUrl } from "@/lib/logout-url";
import { useTenantBranding } from "@/components/TenantBrandingProvider";

interface SidebarProps {
  variant?: "desktop" | "mobile";
  onMobileNavigate?: () => void;
  onMobileClose?: () => void;
}

export default function ManagerSidebar({
  variant = "desktop",
  onMobileNavigate,
  onMobileClose,
}: SidebarProps) {
  const { branding } = useTenantBranding();
  const pathname = usePathname();
  const isMobile = variant === "mobile";
  const headerPadding = isMobile ? "px-4 py-4" : "px-4 py-4";
  const sectionPadding = isMobile ? "px-4 py-3" : "px-4 py-3";
  const navPadding = isMobile ? "px-2" : "px-2";

  const handleLogout = () => {
    onMobileNavigate?.();
    void signOut({ callbackUrl: getLogoutCallbackUrl() });
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={16} /> },
    { label: "Employees", href: "/employees", icon: <UsersIcon size={16} /> },
    { label: "Calendar", href: "/calendar", icon: <Calendar size={16} /> },
    { label: "Team Schedule", href: "/rota", icon: <CalendarClock size={16} /> },
    { label: "Timesheets", href: "/admin/timesheets/hub", icon: <ClipboardList size={16} /> },
    { label: "Reconciliation", href: "/admin/reconciliation", icon: <GitCompare size={16} /> },
    { label: "Documents", href: "/documents", icon: <FileText size={16} /> },
    { label: "Performance", href: "/performance", icon: <Target size={16} /> },
    { label: "Org Chart", href: "/org-chart", icon: <Network size={16} /> },
  ];

  return (
    <div
      className={cn(
        "transition-all duration-300 flex flex-col",
        isMobile ? "h-full w-full max-w-sm p-2" : "h-full p-2 w-[13rem]",
      )}
    >
      {/* Glassmorphism Container */}
      <div className="glass rounded-2xl shadow-glass h-full flex flex-col overflow-hidden">
        {/* Logo Section */}
        <div className={cn("border-b border-glass", headerPadding)}>
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              onClick={() => onMobileNavigate?.()}
              className="flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Go to PeopleCore dashboard"
            >
              <h2 className="text-base font-bold text-foreground">
                PeopleCore
              </h2>
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
        <div className={cn(sectionPadding)}>
          <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Navigation
          </h2>
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 pb-2",
            navPadding,
            isMobile && "overflow-y-auto",
          )}
        >
          <div className="space-y-0.5">
            {navItems.map(({ label, href, icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-glass",
                  pathname === href
                    ? "bg-primary text-primary-foreground shadow-warm"
                    : "text-foreground sidebar-hover-gradient",
                )}
                onClick={() => onMobileNavigate?.()}
              >
                <div className="w-4 h-4">
                  {icon}
                </div>
                <span className="truncate font-medium text-sm">{label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Settings & Logout */}
        <div
          className={cn(
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
