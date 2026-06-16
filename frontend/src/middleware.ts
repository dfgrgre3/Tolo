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

/**
 * توليد nonce مشفّر بـ base64 لاستخدامه في Content Security Policy.
 * يجب أن يطابق القيم المسموح بها في CSP header (RFC 7230 token characters).
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Convert to base64 (URL-safe variant)
  return btoa(String.fromCharCode(...bytes));
}

const isDev = process.env.NODE_ENV === 'development';

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const url = new URL(req.url);

  // Redirect authenticated users away from public auth pages.
  // Only redirect if Clerk has fully resolved the session (userId is present and
  // not undefined/null). Avoid redirecting from API routes to prevent loops.
  // NOTE: Do NOT include "/" here. The root path is a public landing page and
  // redirecting authenticated users away from it can cause an infinite loop
  // when combined with ClientLayoutProvider's last-visited-path restoration.
  const isAuthPage = ["/login", "/register", "/admin-login"].includes(url.pathname);
  if (userId && isAuthPage) {
    const destination = url.pathname === "/admin-login" ? "/admin/dashboard" : "/dashboard";
    // Redirect loop protection: if we recently redirected to the same destination
    // within the protection window, break the loop to prevent infinite page reloads.
    // Window: 10s (generous enough for slow Clerk session init)
    // Threshold: 2 redirects (any more = loop detected)
    const lastRedirectDest = req.cookies.get("__redirect_dest")?.value;
    const lastRedirectTs = req.cookies.get("__redirect_ts")?.value;
    const lastRedirectCount = parseInt(req.cookies.get("__redirect_count")?.value || "0", 10);
    const now = Date.now();
    const withinWindow = lastRedirectTs && (now - parseInt(lastRedirectTs, 10)) < 10_000;
    const isSameDest = lastRedirectDest === destination;

    if (isSameDest && withinWindow && lastRedirectCount >= 2) {
      // Loop detected — let the request through to break the cycle
      // Clear the counters so future legitimate redirects work
      const passThrough = NextResponse.next();
      passThrough.cookies.delete("__redirect_dest");
      passThrough.cookies.delete("__redirect_ts");
      passThrough.cookies.delete("__redirect_count");
      return passThrough;
    } else {
      const response = NextResponse.redirect(new URL(destination, req.url));
      response.cookies.set("__redirect_dest", destination, { httpOnly: true, secure: !isDev, sameSite: "lax", path: "/", maxAge: 15 });
      response.cookies.set("__redirect_ts", isSameDest && withinWindow ? (lastRedirectTs || String(now)) : String(now), { httpOnly: true, secure: !isDev, sameSite: "lax", path: "/", maxAge: 15 });
      response.cookies.set("__redirect_count", String(isSameDest && withinWindow ? lastRedirectCount + 1 : 1), { httpOnly: true, secure: !isDev, sameSite: "lax", path: "/", maxAge: 15 });
      return response;
    }
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Generate a fresh nonce for every request.
  // CSP nonces MUST be unique per response — reusing a nonce via cookie
  // defeats the security model and causes CSP violations when the nonce
  // stored in the cookie drifts out of sync with what Clerk received.
  const nonce = generateNonce();

  // Helper to extract domain origin safely
  const getDomainFromUrl = (url: string | undefined): string => {
    if (!url) return "";
    try {
      const parsed = new URL(url);
      return parsed.origin;
    } catch {
      return "";
    }
  };

  const supabaseOrigin = getDomainFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const apiOrigin = getDomainFromUrl(process.env.NEXT_PUBLIC_API_URL);
  const baseOrigin = getDomainFromUrl(process.env.NEXT_PUBLIC_BASE_URL);
  const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";

  // Derive specific WebSocket origins to prevent insecure ws: and wss: wildcards
  const requestWsOrigin = url.origin.replace(/^http/, 'ws');
  const apiWsOrigin = apiOrigin ? apiOrigin.replace(/^http/, 'ws') : "";
  const supabaseWsOrigin = supabaseOrigin ? supabaseOrigin.replace(/^http/, 'ws') : "";
  const wsHost = process.env.NEXT_PUBLIC_WS_HOST?.trim();
  const customWsOrigin = wsHost
    ? (wsHost.startsWith('ws:') || wsHost.startsWith('wss:') ? wsHost : `wss://${wsHost}`)
    : '';

  // Dynamic Connect Sources
  const connectSources = [
    "'self'",
    "https://tolo.app",
    "https://clerk.tolo.app",
    "https://clerk.tolo.com",
    "https://accounts.tolo.com",
    "https://clerk-telemetry.com",
    "https://*.clerk-telemetry.com",
    "https://challenges.cloudflare.com",
    "https://us.i.posthog.com",
    "https://us-assets.i.posthog.com",
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    requestWsOrigin,
  ];
  if (apiWsOrigin) connectSources.push(apiWsOrigin);
  if (supabaseWsOrigin) connectSources.push(supabaseWsOrigin);
  if (customWsOrigin) connectSources.push(customWsOrigin);
  if (supabaseOrigin) connectSources.push(supabaseOrigin);
  if (apiOrigin) connectSources.push(apiOrigin);
  if (baseOrigin) connectSources.push(baseOrigin);
  if (vercelOrigin) connectSources.push(vercelOrigin);

  if (isDev) {
    connectSources.push("https://*.vercel.app");
    connectSources.push("https://*.supabase.co");
  }

  // Dynamic Frame Sources
  const frameSources = [
    "'self'",
    "https://www.youtube.com",
    "https://www.youtube-nocookie.com",
    "https://clerk.tolo.app",
    "https://clerk.tolo.com",
    "https://accounts.tolo.com",
    "https://challenges.cloudflare.com",
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    "https://clerk.com",
  ];

  // Dynamic Frame Ancestors
  const frameAncestors = [
    "'self'",
    "https://tolo.app",
    "https://www.tolo.app",
  ];
  if (baseOrigin) {
    frameAncestors.push(baseOrigin);
  }

  // Note: 'unsafe-inline' is included alongside the nonce.
  // When a nonce is present in script-src, browsers automatically ignore
  // 'unsafe-inline' (per the CSP3 spec), so this is a no-op security-wise.
  // It serves as a graceful fallback for edge cases where the nonce doesn't
  // propagate correctly (e.g., Vercel CDN stripping response headers on
  // pre-rendered pages, or older CSP Level 2 browsers).
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-hashes' ${isDev ? "'unsafe-eval' " : ""}https://*.clerk.accounts.dev https://clerk.tolo.app https://clerk.tolo.com https://accounts.tolo.com https://*.clerk.com https://challenges.cloudflare.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    "img-src 'self' https: data: blob:",
    "font-src 'self' https://fonts.gstatic.com https://frontend-cdn.perplexity.ai data:",
    "worker-src 'self' blob:",
    `connect-src ${connectSources.join(" ")}`,
    `frame-src ${frameSources.join(" ")}`,
    "media-src 'self' https: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors.join(" ")}`,
    "upgrade-insecure-requests",
  ].join("; ");

  // Pass the nonce down to Server Components via request headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", cspHeader);

  // Set the CSP header on the response (also pass the nonce to RSC via
  // request headers so Next.js can forward it to the rendered HTML)
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("content-security-policy", cspHeader);
  // Also expose nonce for client-side needs (Clerk, analytics, etc.)
  response.headers.set("x-nonce", nonce);

  // Clear any stale cached nonce cookie — nonces must never be reused
  response.cookies.delete("csp-nonce");

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API and RPC routes
    "/(api|trpc)(.*)",
  ],
};
