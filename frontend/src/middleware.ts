import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken')?.value;
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ];

  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));

  // Define protected routes
  const isCustomerRoute = [
    '/dashboard',
    '/products',
    '/cart',
    '/checkout',
    '/orders',
    '/profile',
  ].some((r) => pathname.startsWith(r));

  const isAdminRoute = pathname.startsWith('/admin');
  const isProtectedRoute = isCustomerRoute || isAdminRoute;

  // ✅ If trying to access protected route without token, redirect to login
  if (isProtectedRoute && !accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ✅ If logged in and trying to access login/register, redirect to appropriate dashboard
  // IMPORTANT: Only redirect if on exact /login or /register page
  if (accessToken && (pathname === '/login' || pathname === '/register')) {
    // Don't redirect if there's a callbackUrl - let the login page handle it
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl');
    if (callbackUrl) {
      return NextResponse.next();
    }

    // If admin, go to /admin/dashboard
    const userRole = request.cookies.get('role')?.value;
    if (userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  
    // Otherwise, go to customer dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};