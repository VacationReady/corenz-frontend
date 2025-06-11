// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest) {
    console.log("🔐 Middleware running...");
    const token = req.nextauth?.token;
    console.log("Token found in middleware:", token);

    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        console.log("Authorized check:", token);
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard", "/employees", "/calendar", "/documents", "/settings"],
};
