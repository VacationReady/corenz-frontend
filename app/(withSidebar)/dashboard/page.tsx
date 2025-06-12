import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  switch (role) {
    case "ADMIN":
      return redirect("/dashboard/admin");
    case "MANAGER":
      return redirect("/dashboard/manager");
    case "EMPLOYEE":
    default:
      return redirect("/dashboard/employee");
  }
}
