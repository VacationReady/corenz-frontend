// app/dashboard/admin/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboardPage() {
  // Read the session using the Pages-Router helper
  const session = await getServerSession(authOptions);

  // If not authenticated, send to login
  if (!session?.user) {
    redirect("/login");
  }

  // Fetch the user record along with their employee info
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });

  // If they don’t have an employee record, redirect to the employee dashboard
  if (!user?.employee) {
    redirect("/dashboard/employee");
  }

  // Render the client-side dashboard, passing only serializable props
  return (
    <AdminDashboardClient
      employeeId={user.employee.id}
      firstName={user.firstName ?? undefined}
    />
  );
}
