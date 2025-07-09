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

  const firstName = user.firstName ?? "Admin";
  const employeeId = user.employee.id;

  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Header + Search */}
      <div className="w-full px-6 pt-6 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">
          Hi, {firstName} 👋
        </h1>
        <div className="flex items-center gap-4">
          <LeaveBalanceWidget employeeId={employeeId} titleOnly />
        </div>
      </div>
      <div className="w-full px-6 mt-4 mb-2 relative max-w-md">
        <input
          type="text"
          placeholder="Search..."
          className="w-full rounded-lg border px-4 py-2"
        />
      </div>

      {/* Unified Grid */}
      <main className="flex-1 p-6 w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
        {/* server‐only leave widget */}
        <LeaveBalanceWidget employeeId={employeeId} />

        {/* client‐only rest of the widgets */}
        <AdminDashboardClient employeeId={employeeId} firstName={firstName} />
      </main>
    </div>
  );
}
