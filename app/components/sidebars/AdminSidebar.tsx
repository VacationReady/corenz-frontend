"use client";

import React, { useState, useMemo } from "react";
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
  LineChart,
  LogOut,
  ListChecks,
  Zap,
  Send,
  Repeat,
  TrendingUp,
  Target,
  ClipboardList,
  CalendarClock,
  GitCompare,
} from "lucide-react";
import { useTenantBranding } from "@/components/TenantBrandingProvider";
import {
  SidebarContainer,
  SidebarHeader,
  SidebarSection,
  SidebarItem,
  SidebarAction,
  SidebarFooter,
} from "@/components/navigation/SidebarPrimitives";
import { getLogoutCallbackUrl } from "@/lib/logout-url";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

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
  const { filterNavItems, isFeatureEnabled } = useFeatureToggles();
  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = () => setCollapsed(!collapsed);
  const isMobile = variant === "mobile";

  const brandName = branding.shortName || branding.name;

  const handleLogout = () => {
    onMobileNavigate?.();
    void signOut({ callbackUrl: getLogoutCallbackUrl() });
  };

  // Filter navigation items based on feature toggles
  const filteredHrToolsLinks = useMemo(
    () => filterNavItems(hrToolsLinks),
    [filterNavItems]
  );
  const filteredBulkActionLinks = useMemo(
    () => filterNavItems(bulkActionLinks),
    [filterNavItems]
  );
  
  // Only show App Library if automation_rules feature is enabled
  const showAppLibrary = isFeatureEnabled("automation_rules");

  return (
    <div className={isMobile ? "h-full w-full" : "h-full p-2"}>
      <SidebarContainer collapsed={collapsed} variant={variant}>
        <SidebarHeader
          title="PeopleCore"
          collapsed={collapsed}
          onToggle={variant === "desktop" ? toggleSidebar : undefined}
          onClose={onMobileClose}
          variant={variant}
          homeHref="/dashboard"
          onNavigate={onMobileNavigate}
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
            {[...filteredHrToolsLinks, ...filteredBulkActionLinks, ...(showAppLibrary ? [appLibraryLink] : [])].map((link) => (
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

          <SidebarSection title="System" collapsed={collapsed}>
            <SidebarItem
              href={settingsLink.href}
              icon={settingsLink.icon}
              label={settingsLink.label}
              collapsed={collapsed}
              onClick={onMobileNavigate}
            />
          </SidebarSection>
        </div>

        {/* User Profile */}

        {/* Logout */}
        <div className="p-2">
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
    href: "/admin/action-items",
    icon: ClipboardCheck,
    label: "Action Items",
  },
  { href: "/employees", icon: Users, label: "Employees" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
  { href: "/documents", icon: FileText, label: "Documents" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
];

const hrToolsLinks = [
  { href: "/performance", icon: Target, label: "Performance" },
  { href: "/analytics", icon: LineChart, label: "Analytics" },
  { href: "/admin/timesheets/hub", icon: ClipboardList, label: "Timesheets" },
  { href: "/rota", icon: CalendarClock, label: "Rota/Shifts" },
  { href: "/admin/reconciliation", icon: GitCompare, label: "Reconciliation" },
  { href: "/org-chart", icon: Network, label: "Org Chart" },
  { href: "/news", icon: Megaphone, label: "News" },
  { href: "/surveys", icon: BarChart3, label: "Surveys" },
];

const bulkActionLinks = [
  {
    href: "/bulk-actions",
    icon: ListChecks,
    label: "Bulk actions",
  },
];

const appLibraryLink = {
  href: "/settings/automation-rules",
  icon: Zap,
  label: "App Library",
};


const settingsLink = { href: "/settings", icon: Settings, label: "Settings" };
