import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow static assets (e.g., .png, .jpg, .svg, .css, .js)
  if (/\.[\w]+$/.test(pathname)) {
    return NextResponse.next();
  }

  // Check if user has access token
  const accessToken = request.cookies.get('accessToken')?.value;
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/auth/github-callback'];
  const isPublicRoute = publicRoutes.includes(pathname);
  
  // If user is not authenticated and trying to access a protected route
  if (!accessToken && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (accessToken && (pathname === '/login' || pathname === '/register')) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }
  
  // Redirect root to dashboard if authenticated, otherwise to login
  if (pathname === '/') {
    if (accessToken) {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    } else {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
