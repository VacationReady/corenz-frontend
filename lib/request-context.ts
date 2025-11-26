import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";

export type RequestContext = {
  userId: string;
  companyId: string;
  role?: string | null;
};

/**
 * Centralized helper to fetch the authenticated user's tenant context.
 * Always derive the companyId from the server session to prevent client
 * controlled tenant switching.
 */
export async function getRequestContext(): Promise<RequestContext | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.companyId) {
    return null;
  }

  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    role: session.user.role,
  };
}
