"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

// ✅ Updated import path for AdminSidebar
import AdminSidebar from "./components/sidebars/AdminSidebar";

// 🚫 Manager and Employee sidebars are not yet recreated — skip them safely

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const { data: session, status } = useSession();

  const isProfilePage =
    pathname.startsWith("/employees/") && pathname.split("/").length > 2;

  if (status === "loading") return null;

  const role = session?.user?.role;

  // Dynamically assign sidebar based on role
  let SidebarComponent: React.ReactNode = null;

  if (role === "ADMIN") SidebarComponent = <AdminSidebar />;
  // ManagerSidebar and EmployeeSidebar temporarily disabled

  return (
    <div className="flex min-h-screen bg-gray-100">
      {!isProfilePage && SidebarComponent}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
