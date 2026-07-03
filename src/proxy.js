import { NextResponse } from "next/server";

export function proxy(request) {
  const sessionToken = request.cookies.get("session")?.value;
  const { pathname, searchParams } = request.nextUrl;

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

  // Construct canonical path, retaining specific search params if on the /bible route
  let canonicalPath = pathname;
  if (pathname === "/bible") {
    const book = searchParams.get("book");
    const chapter = searchParams.get("chapter");
    if (book && chapter) {
      canonicalPath = `/bible?book=${encodeURIComponent(book)}&chapter=${chapter}`;
    }
  }

  // Inject x-pathname header for downstream components (e.g. layouts/pages)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", canonicalPath);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
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
