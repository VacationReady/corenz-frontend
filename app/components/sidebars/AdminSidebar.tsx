"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  Calendar,
  FileText,
  Network,
  Megaphone,
  Settings,
  BarChart3,
  LogOut,
} from "lucide-react";
import { useTenantBranding } from "@/components/TenantBrandingProvider";
import {
  SidebarContainer,
  SidebarHeader,
  SidebarSection,
  SidebarItem,
  SidebarAction,
  SidebarProfile,
  SidebarFooter,
} from "@/components/navigation/SidebarPrimitives";

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
  const { data: session } = useSession();
  const { branding } = useTenantBranding();
  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = () => setCollapsed(!collapsed);
  const isMobile = variant === "mobile";

  const brandName = branding.shortName || branding.name;
  const brandLogo = branding.squareLogoUrl || branding.logoUrl || null;

  const handleLogout = () => {
    onMobileNavigate?.();
    void signOut({ callbackUrl: "/login" });
  };

  const logoElement = brandLogo ? (
    <img
      src={brandLogo}
      alt={`${brandName} logo`}
      className="w-full h-full object-contain"
    />
  ) : (
    <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-depth-1">
      <span className="text-primary-foreground font-bold text-lg">
        {branding.initials}
      </span>
    </div>
  );

  return (
    <div className={isMobile ? "h-full w-full" : "p-4"}>
      <SidebarContainer collapsed={collapsed} variant={variant}>
        <SidebarHeader
          logo={logoElement}
          title={brandName}
          collapsed={collapsed}
          onToggle={variant === "desktop" ? toggleSidebar : undefined}
          onClose={onMobileClose}
          variant={variant}
        />

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarSection title="Core" collapsed={collapsed}>
            {coreLinks.map((link) => (
              <SidebarItem
                key={link.href}
                href={link.href}
                icon={link.icon}
                label={link.label}
                collapsed={collapsed}
                onClick={onMobileNavigate}
              />
            ))}
          </SidebarSection>

          <SidebarSection title="HR Tools" collapsed={collapsed}>
            {hrToolsLinks.map((link) => (
              <SidebarItem
                key={link.href}
                href={link.href}
                icon={link.icon}
                label={link.label}
                collapsed={collapsed}
                onClick={onMobileNavigate}
              />
            ))}
          </SidebarSection>
        </div>

        {/* User Profile */}
        {session?.user && (
          <SidebarProfile
            user={session.user}
            collapsed={collapsed}
          />
        )}

        {/* Logout */}
        <div className="p-3">
          <SidebarAction
            icon={LogOut}
            label="Logout"
            onClick={handleLogout}
            collapsed={collapsed}
            variant="danger"
          />
        </div>
      </SidebarContainer>
    </div>
  );
}

const coreLinks = [
  {
    href: "/dashboard/admin",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    href: "/dashboard/approvals",
    icon: ClipboardCheck,
    label: "Approvals",
  },
  { href: "/employees", icon: Users, label: "Employees" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
];

const hrToolsLinks = [
  { href: "/documents", icon: FileText, label: "Documents" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/org-chart", icon: Network, label: "Org Chart" },
  { href: "/news", icon: Megaphone, label: "News" },
  { href: "/settings", icon: Settings, label: "Settings" },
];
