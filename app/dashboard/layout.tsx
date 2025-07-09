// app/dashboard/layout.tsx

import React, { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Read the session using the Pages-Router helper
  const session = await getServerSession(authOptions);
  // Use EMPLOYEE as a fallback if no role
  const role = session?.user?.role ?? "EMPLOYEE";

  let Sidebar: React.ReactElement | null = null;
  if (role === "ADMIN") {
    Sidebar = <AdminSidebar />;      // your admin sidebar
  } else if (role === "MANAGER") {
    Sidebar = <ManagerSidebar />;    // your manager sidebar
  } else {
    Sidebar = <EmployeeSidebar />;   // your employee sidebar
  }

  return (
    <div className="flex h-full">
      {Sidebar}
      <main className="flex-1">{children}</main>
    </div>
  );
}
