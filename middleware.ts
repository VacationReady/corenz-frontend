// middleware.ts (for next-auth v4)
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest) {
    // Optional logging for debugging
    console.log("✅ Session active, proceeding:", req.nextUrl.pathname);
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard",
    "/employees",
    "/calendar",
    "/reports",
    "/documents",
    "/settings",
  ],
};
