import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Required for JWT decryption
const secret = process.env.NEXTAUTH_SECRET;

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret });

  console.log("🔐 Middleware: token", token);

  // If no token and trying to access a protected route, redirect to login
  if (!token && req.nextUrl.pathname !== "/login") {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Optional: role-based route protection (you can expand this)
  if (req.nextUrl.pathname.startsWith("/settings") && token?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/calendar",
    "/documents",
    "/employees",
    "/settings/:path*",
    "/profile",
  ],
};
