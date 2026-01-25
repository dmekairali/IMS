// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Allow API routes to pass through without authentication check
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  const publicPaths = ['/login'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  const token = request.cookies.get('auth-token')?.value;
  
  if (!isPublicPath && !token && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (isPublicPath && token && pathname === '/login') {
    return NextResponse.redirect(new URL('/live-stock', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$).*)',
  ],
};
