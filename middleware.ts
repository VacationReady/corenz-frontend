import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAllowedOrigin } from "./app/lib/origin";
import { rateLimit } from "./app/lib/rate-limit";

const RESTRICTED_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

const RATE_LIMIT_PATHS = [
  "/api/auth",
  "/api/email",
  "/api/upload",
  "/api/report",
  "/api/employees",
  "/api/documents",
  "/api/news",
];

export async function middleware(request: NextRequest) {
  if (RESTRICTED_METHODS.includes(request.method)) {
    const origin = request.headers.get("origin");
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }
  }

  const requestHeaders = new Headers(request.headers);
  if (!requestHeaders.has("x-company-id")) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (token?.companyId) {
      requestHeaders.set("x-company-id", String(token.companyId));
    }
  }

  const path = request.nextUrl.pathname;
  if (RATE_LIMIT_PATHS.some((p) => path.startsWith(p))) {
    const ip = request.ip || requestHeaders.get("x-forwarded-for") || "unknown";
    const tenantId = requestHeaders.get("x-company-id") || "public";
    const key = `${tenantId}:${ip}`;
    const limit = Number(process.env.RATE_LIMIT_MAX ?? "120");
    const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? "60000");
    const limited = await rateLimit(key, { limit, windowMs });
    if (limited) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 },
      );
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/api/:path*"],
};
