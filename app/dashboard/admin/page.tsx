// app/dashboard/admin/page.tsx

import { getServerSession } from "next-auth";
import { authOptions }     from "@/lib/auth-options";
import { prisma }          from "@/lib/prisma";
import { redirect }        from "next/navigation";
import LeaveBalanceWidget  from "@/components/dashboard/LeaveBalanceWidget";
import dynamic             from "next/dynamic";

// Dynamically load your entire client dashboard—no SSR, so server never serializes it
const AdminDashboardClient = dynamic(
  () => import("./AdminDashboardClient"),
  { ssr: false }
);

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  if (!user?.employee) redirect("/dashboard/employee");

  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Header + Search (server) */}
      <div className="w-full px-6 pt-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Hi, {user.firstName} 👋</h1>
        <LeaveBalanceWidget employeeId={user.employee.id} titleOnly />
      </div>
      <div className="px-6 mt-4 mb-2 max-w-md relative">
        <input
          type="text"
          placeholder="Search..."
          className="w-full rounded-lg border px-4 py-2"
        />
      </div>

      {/* Unified grid: first server widget, then the dynamic client bundle */}
      <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <LeaveBalanceWidget employeeId={user.employee.id} />
        <AdminDashboardClient
          employeeId={user.employee.id}
          firstName={user.firstName}
        />
      </main>
    </div>
  );
}
