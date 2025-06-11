import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest) {
    console.log("🔐 Middleware passed");
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
  matcher: ["/dashboard", "/employees", "/calendar", "/documents", "/settings"],
};
