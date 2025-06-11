// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // ✅ Only require auth if NOT on the login page
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    // ✅ Protect everything except login and static assets
    "/((?!api|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
