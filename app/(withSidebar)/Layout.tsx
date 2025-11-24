"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import AdminSidebar from "@/components/sidebars/AdminSidebar";
import ManagerSidebar from "@/components/sidebars/ManagerSidebar";
import EmployeeSidebar from "@/components/sidebars/EmployeeSidebar";

type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN";

export default function WithSidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const _pathname = usePathname();
  const { data: session } = useSession();

  const resolvedRole =
    (session?.user?.role as UserRole | undefined) ?? "EMPLOYEE";

  const getSidebar = () => {
    if (resolvedRole === "ADMIN" || resolvedRole === "SUPER_ADMIN") {
      return <AdminSidebar variant="desktop" />;
    }

    if (resolvedRole === "MANAGER") {
      return <ManagerSidebar variant="desktop" />;
    }

    return <EmployeeSidebar variant="desktop" />;
  };

  const _navItems = useMemo(
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
        title: "Analytics",
        href: "/analytics",
        icon: "LineChart",
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
    <div className="flex h-screen">
      <div className="w-80 flex-shrink-0 hidden lg:block">
        {getSidebar()}
      </div>
      <main className="flex-1 overflow-y-auto bg-background/80 backdrop-blur-sm">{children}</main>
    </div>
  );
}