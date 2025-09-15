import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAllowedOrigin } from "./app/lib/origin";

const RESTRICTED_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

export function middleware(request: NextRequest) {
  if (RESTRICTED_METHODS.includes(request.method)) {
    const origin = request.headers.get("origin");
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
