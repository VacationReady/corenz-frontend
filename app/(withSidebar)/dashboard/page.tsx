// app/dashboard/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-options";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;

  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    redirect("/dashboard/admin");
  }

  if (role === "MANAGER") {
    redirect("/dashboard/manager");
  }

  redirect("/dashboard/employee");
}
