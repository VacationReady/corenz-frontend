// app/(withSidebar)/layout.tsx

import React, { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import ClientLayout from "@/ClientLayout";

export default async function WithSidebarLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const initialRole = session?.user?.role as
    | "ADMIN"
    | "MANAGER"
    | "EMPLOYEE"
    | "SUPER_ADMIN"
    | undefined;

  return <ClientLayout initialRole={initialRole}>{children}</ClientLayout>;
}
