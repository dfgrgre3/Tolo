import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/ai(.*)",
  "/profile(.*)",
  "/progress(.*)",
  "/tasks(.*)",
  "/schedule(.*)",
  "/settings(.*)",
  "/academy(.*)",
  "/achievements(.*)",
  "/billing(.*)",
  "/goals(.*)",
  "/leaderboard(.*)",
  "/notifications(.*)",
  "/subscription(.*)",
  "/time(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Generate dynamic CSP Nonce
  const nonce = btoa(crypto.randomUUID());
  const cspHeader = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: https://*.clerk.accounts.dev https://clerk.tolo.app https://*.clerk.com; style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com; img-src 'self' https: data: blob:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://*.tolo.app https://*.vercel.app https://*.clerk.accounts.dev https://clerk.tolo.app https://*.clerk.com wss: ws:; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; media-src 'self' https: blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;`;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, API routes, and standard web metadata files
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|[^?]*\\.[\\w]+$).*)",
  ],
};
