import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    // ✅ Allow the login page through
    if (pathname === "/login") return NextResponse.next();

    // ✅ Authenticated requests continue
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // ✅ Only allow access if there's a valid token
        return !!token;
      },
    },
    secret: process.env.NEXTAUTH_SECRET, // ✅ must match .env
  }
);

export const config = {
  matcher: ["/((?!api|_next|static|favicon.ico).*)"], // ✅ only run on pages, not assets or API
};
