import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isPublicApi = request.nextUrl.pathname.startsWith('/api/auth'); // Allow login/logout

  // 1. If no token and trying to access protected route -> Redirect to Login
  if (!token && !isLoginPage && !isPublicApi) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. If token exists and trying to access Login -> Redirect to Home
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
