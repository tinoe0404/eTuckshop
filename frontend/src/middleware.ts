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

  // Public routes
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
  const isPublic = publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));

  // Protected routes
  const isCustomerRoute = [
    '/dashboard',
    '/products',
    '/cart',
    '/checkout',
    '/orders',
    '/profile'
  ].some(r => pathname.startsWith(r));

  const isAdminRoute = pathname.startsWith('/admin');

  const isProtectedRoute = isCustomerRoute || isAdminRoute;

  // Redirect unauthenticated users trying to access protected pages
  if (isProtectedRoute && !accessToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If logged in and visiting login or register, just allow
  if (accessToken && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
