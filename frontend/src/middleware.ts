import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken')?.value;
  const { pathname } = request.nextUrl;

  // Public routes - anyone can access
  const publicRoutes = ['/login', '/register', '/forgot-password'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Check if route is protected
  const isCustomerRoute = pathname.startsWith('/dashboard') || 
                          pathname.startsWith('/products') || 
                          pathname.startsWith('/cart') || 
                          pathname.startsWith('/checkout') || 
                          pathname.startsWith('/orders') ||
                          pathname.startsWith('/profile');

  const isAdminRoute = pathname.startsWith('/admin');

  // Redirect logic
  if (isPublicRoute && accessToken) {
    // Already logged in, redirect to appropriate dashboard
    // Note: We can't easily check role here without decoding JWT
    // So we'll handle this in the component level
    return NextResponse.next();
  }

  if ((isCustomerRoute || isAdminRoute) && !accessToken) {
    // Not logged in, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};