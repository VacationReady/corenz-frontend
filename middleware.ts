import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAllowedOrigin } from "./app/lib/origin";
import { rateLimit } from "./app/lib/rate-limit";

const RESTRICTED_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

const RATE_LIMIT_PATHS = [
  "/api/email",
  "/api/upload",
  "/api/report",
  "/api/employees",
  "/api/documents",
  "/api/news",
];

// Exclude NextAuth routes and other system routes from middleware
const EXCLUDED_PATHS = [
  "/api/auth",
  "/api/health",
  "/api/test",
  "/_next",
  "/favicon.ico",
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Skip middleware for excluded paths
  if (EXCLUDED_PATHS.some((excludedPath) => path.startsWith(excludedPath))) {
    return NextResponse.next();
  }

  try {
    // Note: RBAC is enforced in server components for dashboard pages.
    // Avoid RBAC in middleware to prevent auth token issues and redirect loops.

    // Origin checking for restricted methods
    if (RESTRICTED_METHODS.includes(request.method)) {
      const origin = request.headers.get("origin");
      const selfOrigin = request.nextUrl.origin;
      // Allow same-origin and no-origin requests; enforce allowlist only for true cross-origin
      if (origin && origin !== selfOrigin && !isAllowedOrigin(origin)) {
        return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
      }
    }

    const requestHeaders = new Headers(request.headers);
    
    // Add company ID header if not present
    if (!requestHeaders.has("x-company-id")) {
      try {
        const tokenForHeader = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
        if (tokenForHeader?.companyId) {
          requestHeaders.set("x-company-id", String(tokenForHeader.companyId));
        }
      } catch (error) {
        console.warn("Failed to get token:", error);
        // Continue without company ID
      }
    }

    // Rate limiting with timeout protection
    if (RATE_LIMIT_PATHS.some((p) => path.startsWith(p))) {
      try {
        const forwardedFor = requestHeaders.get("x-forwarded-for");
        const ip = forwardedFor?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
        const tenantId = requestHeaders.get("x-company-id") || "public";
        const key = `${tenantId}:${ip}`;
        const limit = Number(process.env.RATE_LIMIT_MAX ?? "120");
        const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? "60000");
        
        // Add timeout to rate limiting
        const rateLimitPromise = rateLimit(key, { limit, windowMs });
        const timeoutPromise = new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error("Rate limit timeout")), 5000)
        );
        
        const limited = await Promise.race([rateLimitPromise, timeoutPromise]);
        
        if (limited) {
          return NextResponse.json(
            { error: "Too many requests" },
            { status: 429 },
          );
        }
      } catch (error) {
        console.warn("Rate limiting failed:", error);
        // Continue without rate limiting if it fails
      }
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (error) {
    console.error("Middleware error:", error);
    // Return a basic response to prevent hanging
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};