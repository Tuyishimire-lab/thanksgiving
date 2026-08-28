import { NextResponse } from "next/server";

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// In-memory sliding-window counters, keyed by IP.
// Resets naturally when the serverless instance recycles.
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 30;      // max requests per window per IP

function isRateLimited(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // Start a new window
    entry = { windowStart: now, count: 1 };
    rateLimitMap.set(ip, entry);
    return false;
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  return false;
}

// Periodically prune stale entries (every 500 requests)
let requestCounter = 0;
function pruneRateLimitMap() {
  requestCounter++;
  if (requestCounter % 500 === 0) {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
        rateLimitMap.delete(ip);
      }
    }
  }
}

// ─── Proxy (named export required by Next.js 16) ──────────────────────────────

export function proxy(request) {
  const { pathname, searchParams } = request.nextUrl;

  // --- Rate limiting on sensitive mutation endpoints ---
  const rateLimitedPaths = ["/login", "/signup", "/api/notifications"];
  const shouldRateLimit = rateLimitedPaths.some(p => pathname.startsWith(p));

  if (shouldRateLimit) {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

    pruneRateLimitMap();
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down and try again shortly." },
        { status: 429 }
      );
    }
  }

  // --- Route protection ---
  const sessionToken = request.cookies.get("session")?.value;
  const protectedRoutes = ["/profile", "/admin"];

  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!sessionToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // --- Canonical path header for downstream components ---
  let canonicalPath = pathname;
  if (pathname === "/bible") {
    const book = searchParams.get("book");
    const chapter = searchParams.get("chapter");
    if (book && chapter) {
      canonicalPath = `/bible?book=${encodeURIComponent(book)}&chapter=${chapter}`;
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", canonicalPath);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // Apply middleware to all routes except static assets and dev files
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets (public asset images/videos)
     * - sw.js (service worker)
     */
    "/((?!_next/static|_next/image|favicon.ico|assets|sw.js).*)",
  ],
};
