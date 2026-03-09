import { withAuth } from "next-auth/middleware"

import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const role = (token?.role as string)?.toLowerCase() || 'user';

    // Auto-redirect admins attempting to access standard dashboard directly to the admin panel
    if (req.nextUrl.pathname.startsWith('/dashboard') && role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // If navigating to admin, require admin role
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return (token?.role as string)?.toLowerCase() === 'admin';
        }
        // Require authentication for root and api routes
        return !!token
      }
    },
  }
)

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] }
