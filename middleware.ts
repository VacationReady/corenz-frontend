import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest, _next) {
    const isLoginPage = req.nextUrl.pathname.startsWith("/login");

    // `withAuth` automatically injects `token` into the context
    const token = (req as any).nextauth?.token;
    const isAuth = !!token;

    // ✅ Prevent redirect loop
    if (!isAuth && !isLoginPage) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard", "/profile", "/calendar", "/employees", "/documents"],
};
