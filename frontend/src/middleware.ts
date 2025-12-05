import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken')?.value;
  const { pathname } = request.nextUrl;

  const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/',
  ];

  const isPublicRoute =
    publicRoutes.some(route => pathname === route || pathname.startsWith(route));

  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

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

  // If not logged in and trying to access protected routes → redirect to login
  if (isProtectedRoute && !accessToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
