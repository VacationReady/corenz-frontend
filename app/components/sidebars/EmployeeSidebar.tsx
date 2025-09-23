"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, LayoutDashboard, Calendar, Clock, User, X } from "lucide-react";
import { signOut } from "next-auth/react";
import clsx from "clsx";

interface SidebarProps {
  variant?: "desktop" | "mobile";
  onMobileNavigate?: () => void;
  onMobileClose?: () => void;
}

export default function EmployeeSidebar({
  variant = "desktop",
  onMobileNavigate,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const isMobile = variant === "mobile";
  const headerPadding = isMobile ? "px-6 py-6" : "px-8 py-8";
  const sectionPadding = isMobile ? "px-6 py-5" : "px-8 py-6";
  const navPadding = isMobile ? "px-4" : "px-6";

  const handleLogout = () => {
    onMobileNavigate?.();
    void signOut({ callbackUrl: "/login" });
  };

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard size={18} />,
    },
    { label: "Calendar", href: "/calendar", icon: <Calendar size={18} /> },
    { label: "My Leave", href: "/leave", icon: <Clock size={18} /> },
    { label: "My Profile", href: "/profile", icon: <User size={18} /> },
  ];

  return (
    <div
      className={clsx(
        "transition-all duration-300 flex flex-col",
        isMobile ? "h-full w-full max-w-sm p-4" : "min-h-screen m-4 ml-6 w-80",
      )}
    >
      {/* Glassmorphism Container */}
      <div className="glass rounded-3xl shadow-glass h-full flex flex-col overflow-hidden">
        {/* Logo Section */}
        <div className={clsx("border-b border-glass", headerPadding)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center mr-4 shadow-warm">
                <span className="text-primary-foreground font-bold text-lg">
                  P
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">PeopleCore</h2>
                <p className="text-sm text-muted-foreground">Employee Portal</p>
              </div>
            </div>
            {isMobile && onMobileClose && (
              <button
                onClick={onMobileClose}
                className="p-3 hover-glass rounded-2xl transition-glass"
              >
                <X className="h-6 w-6 text-foreground" />
                <span className="sr-only">Close navigation</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions Header */}
        <div className={clsx(sectionPadding)}>
          <h2 className="text-lg font-bold text-foreground mb-2">
            Quick actions
          </h2>
          <p className="text-sm text-muted-foreground">
            Navigate your workspace
          </p>
        </div>

        {/* Navigation */}
        <nav
          className={clsx(
            "flex-1 pb-6",
            navPadding,
            isMobile && "overflow-y-auto",
          )}
        >
          <div className="space-y-2">
            {navItems.map(({ label, href, icon }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-4 px-4 py-3 rounded-2xl transition-glass hover-glass",
                  pathname === href
                    ? "bg-primary text-primary-foreground shadow-warm"
                    : "text-foreground",
                )}
                onClick={() => onMobileNavigate?.()}
              >
                <div className="w-6 h-6">
                  {React.cloneElement(icon, { size: 24 })}
                </div>
                <span className="truncate font-medium text-base">{label}</span>
              </Link>
            ))}
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
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
