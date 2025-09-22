"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, LayoutDashboard, Calendar, Clock, User } from "lucide-react";
import { signOut } from "next-auth/react";
import clsx from "clsx";
import { useTenantBranding } from "@/components/TenantBrandingProvider";

export default function EmployeeSidebar() {
  const { branding } = useTenantBranding();
  const pathname = usePathname();
  const brandName = branding.shortName || branding.name;
  const brandLogo = branding.squareLogoUrl || branding.logoUrl || null;

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
    <div className="min-h-screen transition-all duration-300 flex flex-col m-4 ml-6 w-80">
      {/* Glassmorphism Container */}
      <div className="glass rounded-3xl shadow-glass h-full flex flex-col overflow-hidden">
        {/* Logo Section */}
        <div className="px-8 py-8 border-b border-glass">
          <div className="flex items-center">
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
            <div>
              <h2 className="text-2xl font-bold text-foreground">{brandName}</h2>
              <p className="text-sm text-muted-foreground">Employee Portal</p>
            </div>
          </div>
        </div>

        {/* Quick Actions Header */}
        <div className="px-8 py-6">
          <h2 className="text-lg font-bold text-foreground mb-2">
            Quick actions
          </h2>
          <p className="text-sm text-muted-foreground">
            Navigate your workspace
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-6 pb-6">
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
        <div className="border-t border-glass px-6 py-6">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
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
