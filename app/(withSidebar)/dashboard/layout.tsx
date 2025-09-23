// app/(withSidebar)/dashboard/layout.tsx

import React, { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import AdminSidebar from "@/components/sidebars/AdminSidebar";
import ManagerSidebar from "@/components/sidebars/ManagerSidebar";
import EmployeeSidebar from "@/components/sidebars/EmployeeSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? "EMPLOYEE";

  let Sidebar: React.ReactElement | null = null;
  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    Sidebar = <AdminSidebar />;
  } else if (role === "MANAGER") {
    Sidebar = <ManagerSidebar />;
  } else {
    Sidebar = <EmployeeSidebar />;
  }

  // ✅ Sidebar now shows consistently across all /dashboard/* pages
  return (
    <div className="flex min-h-screen bg-app-background">
      {Sidebar}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
