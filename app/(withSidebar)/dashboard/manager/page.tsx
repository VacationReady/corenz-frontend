import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import ManagerDashboardClient from "./ManagerDashboardClient";

export default async function ManagerDashboardPage() {
  const session = await getServerSession(authOptions);
  
  const userId = session?.user?.id;
  
  const user = userId ? await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true }
  }) : null;

  return <ManagerDashboardClient firstName={user?.firstName} />;
}
