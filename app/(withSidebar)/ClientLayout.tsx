"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import AdminSidebar from "../components/sidebars/AdminSidebar/AdminSidebar";
import ManagerSidebar from "../components/sidebars/ManagerSidebar/ManagerSidebar";
import EmployeeSidebar from "../components/sidebars/EmployeeSidebar/EmployeeSidebar";


export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const { data: session, status } = useSession();

  const isProfilePage =
    pathname.startsWith("/employees/") &&
    pathname.split("/").length > 2;

  if (status === "loading") return null;

  const role = session?.user?.role;

  let SidebarComponent: React.ReactNode = null;

if (role === "ADMIN") SidebarComponent = <AdminSidebar />;
else if (role === "MANAGER") SidebarComponent = <ManagerSidebar />;
else SidebarComponent = <EmployeeSidebar />;


  return (
    <div className="flex min-h-screen bg-gray-100">
      {!isProfilePage && SidebarComponent}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}


