// app/dashboard/admin/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import LeaveBalanceWidget from "@/components/dashboard/LeaveBalanceWidget";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  if (!user?.employee) redirect("/dashboard/employee");

  return (
    <>
      {/* 1) Server-only live leave widget */}
      <LeaveBalanceWidget employeeId={user.employee.id} />

      {/* 2) Client-only dashboard UI */}
      <AdminDashboardClient
        employeeId={user.employee.id}
        firstName={user.firstName ?? undefined}
      />
    </>
  );
}
