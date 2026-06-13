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

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const url = new URL(req.url);

  // Redirect authenticated users from root route or public auth pages to dashboard
  if (userId && (url.pathname === "/" || url.pathname === "/login" || url.pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Get or generate session-based CSP nonce to preserve browser/CDN caching
  let nonce = req.cookies.get("csp-nonce")?.value;
  const isNewNonce = !nonce;
  if (!nonce) {
    nonce = generateNonce();
  }

  const isDev = process.env.NODE_ENV === 'development';

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
    "https://clerk-telemetry.com",
    "https://challenges.cloudflare.com",
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
    connectSources.push("https://*.clerk.accounts.dev");
    connectSources.push("https://*.vercel.app");
    connectSources.push("https://*.supabase.co");
    connectSources.push("https://*.clerk.com");
    connectSources.push("https://*.clerk-telemetry.com");
  } else {
    connectSources.push("https://clerk.com");
  }

  // Dynamic Frame Sources
  const frameSources = [
    "'self'",
    "https://www.youtube.com",
    "https://www.youtube-nocookie.com",
    "https://clerk.tolo.app",
    "https://challenges.cloudflare.com",
  ];
  if (isDev) {
    frameSources.push("https://*.clerk.accounts.dev");
    frameSources.push("https://*.clerk.com");
  } else {
    frameSources.push("https://clerk.com");
  }

  // Dynamic Frame Ancestors
  const frameAncestors = [
    "'self'",
    "https://tolo.app",
    "https://www.tolo.app",
  ];
  if (baseOrigin) {
    frameAncestors.push(baseOrigin);
  }

  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-hashes' 'sha256-HOy+N/XLxP4bBXPgFk73cDMc524cZhcklyvEq7GJ34c=' ${isDev ? "'unsafe-eval' " : ""}https: https://*.clerk.accounts.dev https://clerk.tolo.app https://*.clerk.com https://challenges.cloudflare.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    "img-src 'self' https: data: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
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

  if (isNewNonce) {
    response.cookies.set("csp-nonce", nonce, {
      httpOnly: true,
      secure: !isDev,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API and RPC routes
    "/(api|trpc)(.*)",
  ],
};
