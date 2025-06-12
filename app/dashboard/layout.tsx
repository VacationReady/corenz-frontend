import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { ReactNode } from "react";
import AdminSidebar from "@/components/sidebars/AdminSidebar";
// import ManagerSidebar from "@/components/sidebars/ManagerSidebar";
// import EmployeeSidebar from "@/components/sidebars/EmployeeSidebar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  let Sidebar = null;

  if (role === "ADMIN") {
    Sidebar = <AdminSidebar />;
  }
  // Uncomment when available:
  // else if (role === "MANAGER") Sidebar = <ManagerSidebar />;
  // else Sidebar = <EmployeeSidebar />;

  return (
    <div className="flex min-h-screen bg-neutral-900 text-white">
      {Sidebar}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
