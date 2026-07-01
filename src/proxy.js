import { NextResponse } from "next/server";

export function proxy(request) {
  const sessionToken = request.cookies.get("session")?.value;
  const { pathname } = request.nextUrl;

  // Define paths that require authentication
  const protectedRoutes = ["/profile", "/admin"];

  // If trying to access a protected route without a session cookie, redirect to /login
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!sessionToken) {
      const loginUrl = new URL("/login", request.url);
      // Pass the original destination as a query parameter for redirection after login
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Allow requests to proceed
  return NextResponse.next();
}

export const config = {
  // Apply proxy to all routes except API routes, static assets, and dev files
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets (public asset images/videos)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|assets).*)",
  ],
};
