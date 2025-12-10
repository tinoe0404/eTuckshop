import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken')?.value;
  const userRole = request.cookies.get('userRole')?.value; // assuming you store role in a cookie
  const { pathname } = request.nextUrl;

  // Skip API, static files, Next.js internals
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
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));

  // Protected routes
  const customerRoutes = ['/dashboard', '/products', '/cart', '/checkout', '/orders', '/profile'];
  const isCustomerRoute = customerRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = pathname.startsWith('/admin');
  const isProtectedRoute = isCustomerRoute || isAdminRoute;

  // 1️⃣ Redirect unauthenticated users trying to access protected routes
  if (isProtectedRoute && !accessToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2️⃣ Redirect authenticated users away from login/register to their correct dashboard
  if (accessToken && (pathname === '/login' || pathname === '/register')) {
    if (userRole === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3️⃣ Optionally redirect customers away from admin routes
  if (isAdminRoute && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
