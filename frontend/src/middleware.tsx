import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("accessToken")?.value;
  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = ["/login", "/register"];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // If on public route and has token, redirect to home
  if (isPublicRoute && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protected routes
  const protectedRoutes = ["/cart", "/checkout", "/orders", "/profile"];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // If on protected route and no token, redirect to login
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admin routes
  const adminRoutes = ["/admin"];
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

  // If on admin route, check token (role check happens client-side)
  if (isAdminRoute && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};