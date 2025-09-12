// For each of your routes requiring sidebar visibility:
// /calendar, /employees, /approvals, /reports, /news, /settings
// Place this file as:
// /app/(withSidebar)/<route>/layout.tsx

import React, { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import AdminSidebar from "@/components/sidebars/AdminSidebar";
import ManagerSidebar from "@/components/sidebars/ManagerSidebar";
import EmployeeSidebar from "@/components/sidebars/EmployeeSidebar";

export default async function SectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
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
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
