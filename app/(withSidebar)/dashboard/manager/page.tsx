import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import ManagerDashboardClient from "./ManagerDashboardClient";
import { getDownloadUrl } from "@/lib/getDownloadUrl";

export default async function ManagerDashboardPage() {
  const session = await auth();
  
  const userId = session?.user?.id;
  let employeeId: string | undefined = undefined;
  
  if (userId && session?.user?.companyId) {
    const employee = await prisma.employee.findFirst({
      where: { userId, companyId: session.user.companyId },
      select: { id: true },
    });
    employeeId = employee?.id;
  }
  
  const user = userId ? await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      name: true,
      profileImageUrl: true,
    },
  }) : null;

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.name ||
    "User";

  const avatarUrl = user?.profileImageUrl
    ? await getDownloadUrl(user.profileImageUrl)
    : null;

  return (
    <ManagerDashboardClient
      firstName={user?.firstName}
      fullName={fullName}
      avatarUrl={avatarUrl}
      employeeId={employeeId}
    />
  );
}
