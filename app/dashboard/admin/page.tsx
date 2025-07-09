// app/dashboard/admin/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboardPage() {
  // 1) Read the session on the server
  const session = await getServerSession(authOptions);

  // 2) Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  // 3) Fetch user record (including employee)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });

  // 4) Redirect non-employee users to employee dashboard
  if (!user?.employee) {
    redirect("/dashboard/employee");
  }

  const employeeId = user.employee.id;

  // 5) Render LeaveBalanceWidget (server) and client UI
  return (
    <>
      <AdminDashboardClient
        employeeId={employeeId}
        firstName={user.firstName ?? undefined}
      />
    </>
  );
}
