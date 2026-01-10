import React from "react";
import { auth } from "@/lib/auth-options";
import AdminSidebar from "@/components/sidebars/AdminSidebar";
import ManagerSidebar from "@/components/sidebars/ManagerSidebar";
import EmployeeSidebar from "@/components/sidebars/EmployeeSidebar";
import WithSidebarChromeClient from "./WithSidebarChromeClient";
import FloatingBugButton from "@/components/bugs/FloatingBugButton";

type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN";

export default async function WithSidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const resolvedRole =
    (session?.user?.role as UserRole | undefined) ?? "EMPLOYEE";

  const desktopSidebar =
    resolvedRole === "ADMIN" || resolvedRole === "SUPER_ADMIN" ? (
      <AdminSidebar variant="desktop" />
    ) : resolvedRole === "MANAGER" ? (
      <ManagerSidebar variant="desktop" />
    ) : (
      <EmployeeSidebar variant="desktop" />
    );

  return (
    <div className="flex min-h-screen flex-col">
      <WithSidebarChromeClient resolvedRole={resolvedRole} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden lg:flex lg:shrink-0">
          {desktopSidebar}
        </aside>
        {/* Semi-transparent background to show layered background effects */}
        <main 
          className="flex-1 overflow-y-auto bg-background/80 backdrop-blur-sm"
          style={{
            /* Optimize scroll performance */
            contain: 'layout style',
          }}
        >
          {children}
        </main>
      </div>
      {/* Floating Bug Report Button - visible when feature is enabled */}
      <FloatingBugButton />
    </div>
  );
}