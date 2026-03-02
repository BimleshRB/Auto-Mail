import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      // If navigating to admin, require admin role
      if (req.nextUrl.pathname.startsWith('/admin')) {
        return token?.role === 'admin'
      }
      // Require authentication for root and api routes
      return !!token
    }
  },
})

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] }
