import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const userRole = token?.role;

    console.log('🛡️ Middleware Active:', { path, role: userRole });

    // 1. Protect Admin Routes: Only ADMINs can access /admin
    if (path.startsWith('/admin')) {
      if (userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // 2. Protect Customer Dashboard: ADMINs should be redirected to /admin
    // (Assuming admins shouldn't see the customer view)
    if (path.startsWith('/dashboard') && !path.startsWith('/admin')) {
      if (userRole === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // If the matcher catches the route, this runs first. 
      // Returning true allows the middleware function above to run.
      // Returning false redirects to /login.
      authorized: ({ token }) => {
        return !!token; // Require token for all matched routes
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  // ✅ FIX: Only run middleware on these specific protected paths.
  // This ensures /register and /login are completely ignored by NextAuth.
  matcher: [
    "/dashboard/:path*", 
    "/admin/:path*",
    "/api/user/:path*" // Optional: Add any protected API routes
  ],
};