// app/(withSidebar)/layout.tsx

import React, { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import AdminSidebar from "@/components/sidebars/AdminSidebar";
import ManagerSidebar from "@/components/sidebars/ManagerSidebar";
import EmployeeSidebar from "@/components/sidebars/EmployeeSidebar";
import { TenantProvider } from "@/components/TenantProvider";
import { prisma } from "@/lib/prisma";
import { resolveTenantDatePreferences } from "@/lib/datetime";

export default async function WithSidebarLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? "EMPLOYEE";
  const companyId = session?.user?.companyId;

  const company = companyId
    ? await prisma.company.findUnique({
        where: { id: companyId },
        select: { publicHolidayTemplate: true },
      })
    : null;

  const tenantPreferences = resolveTenantDatePreferences(
    company?.publicHolidayTemplate ?? null,
  );

  let Sidebar: React.ReactElement | null = null;

  if (role === "ADMIN") {
    Sidebar = <AdminSidebar />;
  } else if (role === "MANAGER") {
    Sidebar = <ManagerSidebar />;
  } else {
    Sidebar = <EmployeeSidebar />;
  }

  return (
    <TenantProvider initialValue={tenantPreferences}>
      <div className="flex min-h-screen bg-app-background">
        {Sidebar}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </TenantProvider>
  );
}
