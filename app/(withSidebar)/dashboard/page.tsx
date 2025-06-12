import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import AdminDashboardPage from "./AdminDashboardPage";
import ClientDashboard from "./ClientDashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (role === "ADMIN") {
    return <AdminDashboardPage />;
  }

  return <ClientDashboard />;
}
