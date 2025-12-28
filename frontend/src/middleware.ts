import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    console.log('🛡️ Middleware check:', {
      path,
      hasToken: !!token,
      role: token?.role,
      email: token?.email,
    });


    // Prevent Admins from seeing Customer Dashboard
    if (path.startsWith('/dashboard') && !path.startsWith('/admin')) {
      if (token?.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      }
    }

    // Prevent Customers from seeing Admin Dashboard
    if (path.startsWith('/admin')) {
      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // ✅ Redirect admins to admin dashboard if they try to access user dashboard
    if (path.startsWith('/dashboard') && !path.startsWith('/admin/dashboard')) {
      if (token?.role === 'ADMIN') {
        console.log('   ↪️ Admin on user dashboard, redirecting to admin dashboard');
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      }
    }

    console.log('   ✅ Access allowed');
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      // ✅ Determine if user is authorized
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Allow public routes
        if (
          path === '/' ||
          path.startsWith('/login') ||
          path.startsWith('/register') ||
          path.startsWith('/forgot-password') ||
          path.startsWith('/reset-password') ||
          path.startsWith('/_next') ||
          path.startsWith('/api') ||
          path.startsWith('/favicon') ||
          path.includes('.')
        ) {
          return true;
        }

        // Require authentication for all other routes
        return !!token;
      },
    },
    secret: process.env.NEXTAUTH_SECRET,
  }
);

// ✅ Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (SEO files)
     * - images in public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};