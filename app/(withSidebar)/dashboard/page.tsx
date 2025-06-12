import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import type { NextAuthOptions } from "next-auth";
import AdminDashboardPage from "./AdminDashboardPage";
import ClientDashboard from "./ClientDashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions as NextAuthOptions);
  const role = session?.user?.role;

  if (role === "ADMIN") {
    return <AdminDashboardPage />;
  }

  return <ClientDashboard />;
}
