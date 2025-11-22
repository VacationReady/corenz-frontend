import BulkActionsPageClient from "./BulkActionsPageClient";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export default async function BulkActionsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.companyId || !session.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      PermissionProfile: true,
    },
  });

  if (!dbUser) {
    redirect("/unauthorized");
  }

  const user = {
    ...dbUser,
    permissionProfile: dbUser.PermissionProfile,
  };

  if (!hasPermission(user as any, "bulk-actions", "read")) {
    redirect("/unauthorized");
  }

  return <BulkActionsPageClient />;
}
