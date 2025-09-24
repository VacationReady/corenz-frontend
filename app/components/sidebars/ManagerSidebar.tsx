"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogOut, X } from "lucide-react";
import { signOut } from "next-auth/react";
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
  const headerPadding = isMobile ? "px-6 py-6" : "px-8 py-8";
  const sectionPadding = isMobile ? "px-6 py-5" : "px-8 py-6";
  const navPadding = isMobile ? "px-4" : "px-6";

  const brandName = branding.shortName || branding.name;
  const brandLogo = branding.squareLogoUrl || branding.logoUrl || null;

  const handleLogout = () => {
    onMobileNavigate?.();
    void signOut({ callbackUrl: "/login" });
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Employees", href: "/employees" },
    { label: "Calendar", href: "/calendar" },
    { label: "Tasks", href: "/tasks" },
    { label: "Org Chart", href: "/org-chart" },
  ];

  return (
    <div
      className={cn(
        "transition-all duration-300 flex flex-col",
        isMobile ? "h-full w-full max-w-sm p-4" : "min-h-screen m-4 ml-6 w-80",
      )}
    >
      {/* Glassmorphism Container */}
      <div className="glass rounded-3xl shadow-glass h-full flex flex-col overflow-hidden">
        {/* Logo Section */}
        <div className={cn("border-b border-glass", headerPadding)}>
          <div className="flex items-center justify-between">
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
                <h2 className="text-2xl font-bold text-foreground">
                  {brandName}
                </h2>
                <p className="text-sm text-muted-foreground">Manager Panel</p>
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
        <div className={cn(sectionPadding)}>
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

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 pb-6",
            navPadding,
            isMobile && "overflow-y-auto",
          )}
        >
          <div className="space-y-2">
            {navItems.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-2xl transition-glass hover-glass",
                  pathname === href
                    ? "bg-primary text-primary-foreground shadow-warm"
                    : "text-foreground",
                )}
                onClick={() => onMobileNavigate?.()}
              >
                <span className="truncate font-medium text-base">{label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Settings & Logout */}
        <div
          className={cn(
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
