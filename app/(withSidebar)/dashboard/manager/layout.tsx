import React, { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-options";

export default async function ManagerSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  const isAllowed = role === "MANAGER" || role === "ADMIN" || role === "SUPER_ADMIN";
  if (!isAllowed) {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}


