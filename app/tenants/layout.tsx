import React, { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ClientLayout from "@/ClientLayout";
import { authOptions } from "@/lib/auth-options";

export default async function TenantsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (
    session.user.role !== "SUPER_ADMIN" ||
    !session.user.canManageTenants
  ) {
    if (session.user.role === "ADMIN") {
      redirect("/dashboard/admin");
    }

    if (session.user.role === "MANAGER") {
      redirect("/dashboard/manager");
    }

    redirect("/dashboard");
  }

  const initialRole = session.user.role;

  return <ClientLayout initialRole={initialRole}>{children}</ClientLayout>;
}
