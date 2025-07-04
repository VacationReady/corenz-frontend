// /app/dashboard/layout.tsx

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import type { NextAuthOptions } from "next-auth";
import type React from "react";
import { ReactNode } from "react";

import AdminSidebar from "@/components/sidebars/AdminSidebar";
import ManagerSidebar from "@/components/sidebars/ManagerSidebar";
import EmployeeSidebar from "@/components/sidebars/EmployeeSidebar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions as NextAuthOptions);
  const role = session?.user?.role ?? "EMPLOYEE"; // fallback to EMPLOYEE

  let Sidebar: React.ReactElement | null = null;

  if (role === "ADMIN") {
    Sidebar = <AdminSidebar />;
  } else if (role === "MANAGER") {
    Sidebar = <ManagerSidebar />;
  } else {
    Sidebar = <EmployeeSidebar />;
  }

  return (
    <div className="flex min-h-screen bg-surface dark:bg-surface-dark text-gray-900 dark:text-gray-100 transition-colors">
      {Sidebar}
      <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        {/* Pass role to children via context for clarity */}
        <div data-role={role}>
          {children}
        </div>
      </main>
    </div>
  );
}
