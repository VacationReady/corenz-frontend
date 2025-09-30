"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import AdminSidebar from "@/components/sidebars/AdminSidebar";
import { ContextualHelpProvider } from "@/components/help/ContextualHelpProvider";

export default function WithSidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = useMemo(
    () => [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: "LayoutDashboard",
      },
      {
        title: "Employees",
        href: "/employees",
        icon: "Users",
      },
      {
        title: "Calendar",
        href: "/calendar",
        icon: "Calendar",
      },
      {
        title: "Workflow Library",
        href: "/workflows",
        icon: "Workflow",
        badge: "New",
        badgeVariant: "success" as const,
      },
      {
        title: "Org Chart",
        href: "/org-chart",
        icon: "Network",
      },
      {
        title: "Bulk Actions",
        href: "/bulk-actions",
        icon: "ListChecks",
      },
      {
        title: "Onboarding",
        href: "/onboarding",
        icon: "UserPlus",
      },
      {
        title: "Offboarding",
        href: "/offboarding",
        icon: "UserMinus",
      },
      {
        title: "Documents",
        href: "/documents",
        icon: "FileText",
      },
      {
        title: "News",
        href: "/news",
        icon: "Newspaper",
      },
      {
        title: "Settings",
        href: "/settings",
        icon: "Settings",
      },
    ],
    [],
  );

  return (
    <ContextualHelpProvider>
      <div className="flex h-screen bg-background">
        <div className="w-80 flex-shrink-0 hidden lg:block">
          <AdminSidebar />
        </div>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </ContextualHelpProvider>
  );
}