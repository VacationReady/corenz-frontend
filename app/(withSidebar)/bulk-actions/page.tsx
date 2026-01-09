import BulkActionsPageClient from "./BulkActionsPageClient";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { FeatureGuardedPage } from "@/components/FeatureGuardedPage";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";

export default async function BulkActionsPage() {
  const session = await auth();

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

  return (
    <FeatureGuardedPage featureKey={FEATURE_KEYS.BULK_ACTIONS}>
      <BulkActionsPageClient />
    </FeatureGuardedPage>
  );
}
