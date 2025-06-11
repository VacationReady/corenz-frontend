import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;

    // Protect /settings/users for ADMIN only
    if (
      req.nextUrl.pathname.startsWith('/settings/users') &&
      role !== 'ADMIN'
    ) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // You can add more role-based rules here later
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // Require login
    },
  }
);

// Define which routes are protected
export const config = {
  matcher: [
    '/dashboard',
    '/calendar',
    '/documents',
    '/employees',
    '/profile',
    '/settings/:path*', // includes /settings/users
  ],
};
