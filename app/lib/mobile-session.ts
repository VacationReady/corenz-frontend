import { NextRequest } from "next/server";
import { decode } from "next-auth/jwt";
import { auth } from "@/lib/auth-options";
import { env } from "@/lib/env.server";
import { getAllSessionCookieNames } from "@/lib/auth-cookies";
import { Session } from "next-auth";

/**
 * Get session from either NextAuth (browser) or mobile JWT token.
 * This helper supports both web and mobile clients.
 */
export async function getMobileSession(req: NextRequest): Promise<Session | null> {
  // First, try standard NextAuth session (for browser requests)
  const session = await auth();
  if (session?.user?.id) {
    return session;
  }

  // If no session, try to get JWT from Cookie header (mobile app sends this)
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    // Try all known cookie names (v5 and legacy v4) for backward compatibility
    const cookieNames = getAllSessionCookieNames();

    for (const cookieName of cookieNames) {
      const match = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
      if (match) {
        const token = decodeURIComponent(match[1]);
        try {
          const decoded = await decode({
            token,
            secret: env.NEXTAUTH_SECRET,
            salt: env.NEXTAUTH_SECRET,
          });

          if (decoded && decoded.id && decoded.companyId) {
            return {
              user: {
                id: decoded.id as string,
                email: decoded.email as string,
                name: decoded.name as string | undefined,
                role: decoded.role as any,
                companyId: decoded.companyId as string,
                homeCompanyId: decoded.homeCompanyId as string,
                canManageTenants: false,
              },
              expires: decoded.exp 
                ? new Date((decoded.exp as number) * 1000).toISOString()
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            };
          }
        } catch (error) {
          console.error("[mobile-session] Failed to decode token from cookie:", error);
        }
      }
    }
  }

  // Also check Authorization header as a fallback
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const decoded = await decode({
        token,
        secret: env.NEXTAUTH_SECRET,
        salt: env.NEXTAUTH_SECRET,
      });

      if (decoded && decoded.id && decoded.companyId) {
        return {
          user: {
            id: decoded.id as string,
            email: decoded.email as string,
            name: decoded.name as string | undefined,
            role: decoded.role as any,
            companyId: decoded.companyId as string,
            homeCompanyId: decoded.homeCompanyId as string,
            canManageTenants: false,
          },
          expires: decoded.exp 
            ? new Date((decoded.exp as number) * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
      }
    } catch (error) {
      console.error("[mobile-session] Failed to decode token from Authorization header:", error);
    }
  }

  return null;
}


