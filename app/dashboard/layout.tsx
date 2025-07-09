// app/dashboard/layout.tsx

import React, { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import AdminSidebar from "@/components/sidebars/AdminSidebar";
import ManagerSidebar from "@/components/sidebars/ManagerSidebar";
import EmployeeSidebar from "@/components/sidebars/EmployeeSidebar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Read the session using the Pages-Router helper
  const session = await getServerSession(authOptions);
  // Use EMPLOYEE as a fallback if no role
  const role = session?.user?.role ?? "EMPLOYEE";

  let Sidebar: React.ReactElement | null = null;
  if (role === "ADMIN") {
    Sidebar = <AdminSidebar />;
  } else if (role === "MANAGER") {
    Sidebar = <ManagerSidebar />;
  } else {
    Sidebar = <EmployeeSidebar />;
  }

  return (
    <div className="flex h-full">
      {Sidebar}
      <main className="flex-1">{children}</main>
    </div>
  );
}
