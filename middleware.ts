import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    
    // Optional debug logging
    console.log("🔐 MIDDLEWARE TOKEN:", token);

    // Block non-admins from /settings/users
    if (
      req.nextUrl.pathname.startsWith("/settings/users") &&
      token?.role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Allow access if user is logged in
        return !!token;
      },
    },
  }
);

// Apply middleware to these paths
export const config = {
  matcher: [
    "/dashboard",
    "/calendar",
    "/documents",
    "/employees",
    "/profile",
    "/settings/:path*",
  ],
};
