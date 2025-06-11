// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    console.log("🔐 Running middleware...");
    const token = req.nextauth.token;
    console.log("🧪 Token in middleware:", token);

    // If no token, redirect to login
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
        console.log("🧪 Token in authorized callback:", token);
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard", "/employees/:path*", "/calendar", "/documents"],
};
