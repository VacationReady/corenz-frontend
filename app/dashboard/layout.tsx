import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import type { NextAuthOptions } from "next-auth";
import type React from "react";
import { ReactNode } from "react";

import AdminSidebar from "@/components/sidebars/AdminSidebar";
import ManagerSidebar from "@/components/sidebars/ManagerSidebar";
// import EmployeeSidebar from "@/components/sidebars/EmployeeSidebar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions as NextAuthOptions);
  const role = session?.user?.role;

  let Sidebar: React.ReactElement | null = null;

  if (role === "ADMIN") {
    Sidebar = <AdminSidebar />;
  } else if (role === "MANAGER") {
    Sidebar = <ManagerSidebar />;
  }
  // else if (role === "EMPLOYEE") {
  //   Sidebar = <EmployeeSidebar />;
  // }

  return (
    <div className="flex min-h-screen bg-neutral-900 text-white">
      {Sidebar}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
