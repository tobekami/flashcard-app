import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/firebase';

// This function is a middleware that runs before each request to the server.
// It checks if the user is authenticated and if not, redirects them to the login page.
export async function middleware(request: NextRequest) {
  // This line checks if there is a current user session.
  const session = await auth.currentUser;

  // If there is no session and the request is not for the login page, redirect to the login page.
  if (!session && !request.nextUrl.pathname.startsWith('/login')) {
    // This line creates a new URL object for the login page and redirects the request to it.
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If the user is authenticated or the request is for the login page, allow the request to proceed.
  return NextResponse.next();
}

// This configuration specifies which URLs this middleware should run for.
export const config = {
  matcher: [],
};