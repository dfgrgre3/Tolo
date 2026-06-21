import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/admin(.*)",
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
  "/api/cache/revalidate(.*)",
]);

const isDev = process.env.NODE_ENV === 'development';

const getDomainFromUrl = (url: string | undefined): string => {
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
};

function generateNonce(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    try {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return btoa(String.fromCharCode(...bytes));
    } catch {
      // silent fail
    }
  }
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}

const clerkHandler = clerkMiddleware(
  async (auth, req) => {
    const url = req.nextUrl || new URL(req.url);

    const isAuthPage = ["/login", "/register", "/admin-login"].includes(url.pathname);

    if (isProtectedRoute(req)) {
      await auth.protect();

      if (url.pathname.startsWith("/admin")) {
        const authObj = await auth();
        const sessionClaims = authObj.sessionClaims as any;
        const role = sessionClaims?.metadata?.role || sessionClaims?.role;
        if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "MODERATOR") {
          return NextResponse.redirect(new URL("/unauthorized", req.url));
        }
      }
    }

    const isApiRoute = url.pathname.startsWith('/api') || url.pathname.startsWith('/trpc');

    if (isApiRoute) {
      return NextResponse.next();
    }

    if (isAuthPage) {
      const { userId } = await auth();

      if (userId) {
        const destination = url.pathname === "/admin-login" ? "/admin/dashboard" : "/dashboard";

        const lastRedirectDest = req.cookies.get("__redirect_dest")?.value;
        const lastRedirectTs = req.cookies.get("__redirect_ts")?.value;
        const lastRedirectCount = parseInt(req.cookies.get("__redirect_count")?.value || "0", 10);
        const now = Date.now();
        const parsedTs = lastRedirectTs ? parseInt(lastRedirectTs, 10) : NaN;
        const withinWindow = !isNaN(parsedTs) && (now - parsedTs) < 10_000;
        const isSameDest = lastRedirectDest === destination;

        if (isSameDest && withinWindow && lastRedirectCount >= 2) {
          const passThrough = NextResponse.next();
          passThrough.cookies.delete("__redirect_dest");
          passThrough.cookies.delete("__redirect_ts");
          passThrough.cookies.delete("__redirect_count");
          return passThrough;
        } else {
          const response = NextResponse.redirect(new URL(destination, req.url));
          const cookieOptions = { httpOnly: true, secure: !isDev, sameSite: "lax" as const, path: "/", maxAge: 15 };

          response.cookies.set("__redirect_dest", destination, cookieOptions);
          response.cookies.set("__redirect_ts", isSameDest && withinWindow ? (lastRedirectTs || String(now)) : String(now), cookieOptions);
          response.cookies.set("__redirect_count", String(isSameDest && withinWindow ? lastRedirectCount + 1 : 1), cookieOptions);
          return response;
        }
      }
    }

    const nonce = generateNonce();

    const supabaseOrigin = getDomainFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const apiOrigin = getDomainFromUrl(process.env.NEXT_PUBLIC_API_URL);
    const baseOrigin = getDomainFromUrl(process.env.NEXT_PUBLIC_BASE_URL);
    const vercelOrigin = process.env.VERCEL_URL
      ? (process.env.VERCEL_URL.startsWith("http") ? process.env.VERCEL_URL : `https://${process.env.VERCEL_URL}`)
      : "";

    const requestWsOrigin = url.origin.replace(/^http/, 'ws');
    const apiWsOrigin = apiOrigin ? apiOrigin.replace(/^http/, 'ws') : "";
    const supabaseWsOrigin = supabaseOrigin ? supabaseOrigin.replace(/^http/, 'ws') : "";
    const wsHost = process.env.NEXT_PUBLIC_WS_HOST?.trim();
    const customWsOrigin = wsHost
      ? (wsHost.startsWith('ws:') || wsHost.startsWith('wss:') ? wsHost : `wss://${wsHost}`)
      : '';

    const connectSources = [
      "'self'",
      "https://tolo.app",
      "https://clerk.tolo.app",
      "https://clerk.tolo.com",
      "https://tolo.com",
      "https://*.tolo.com",
      "https://accounts.tolo.com",
      "https://frontend-api.clerk.services",
      "https://clerk-telemetry.com",
      "https://*.clerk-telemetry.com",
      "https://challenges.cloudflare.com",
      "https://cdn.jsdelivr.net",
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
      connectSources.push("https://*.vercel.app", "https://*.supabase.co");
    }

    const frameSources = [
      "'self'",
      "https://www.youtube.com",
      "https://www.youtube-nocookie.com",
      "https://clerk.tolo.app",
      "https://clerk.tolo.com",
      "https://tolo.com",
      "https://*.tolo.com",
      "https://accounts.tolo.com",
      "https://frontend-api.clerk.services",
      "https://challenges.cloudflare.com",
      "https://*.clerk.accounts.dev",
      "https://*.clerk.com",
      "https://clerk.com",
    ];

    const frameAncestors = ["'self'", "https://tolo.app", "https://www.tolo.app"];
    if (baseOrigin) frameAncestors.push(baseOrigin);

    const cspHeader = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'sha256-HOy+N/XLxP4bBXPgFk73cDMc524cZhcklyvEq7GJ34c=' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}https://*.clerk.accounts.dev https://clerk.tolo.app https://clerk.tolo.com https://tolo.com https://*.tolo.com https://accounts.tolo.com https://*.clerk.com https://challenges.cloudflare.com https://cdn.jsdelivr.net`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' https: data: blob:",
      "font-src 'self' https://fonts.gstatic.com https://frontend-cdn.perplexity.ai data:",
      "worker-src 'self' blob: https://*.clerk.accounts.dev https://*.clerk.com https://clerk.com",
      `connect-src ${connectSources.join(" ")}`,
      `frame-src ${frameSources.join(" ")}`,
      "media-src 'self' https: blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      `frame-ancestors ${frameAncestors.join(" ")}`,
      "upgrade-insecure-requests",
    ].join("; ");

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("content-security-policy", cspHeader);

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    response.headers.set("content-security-policy", cspHeader);
    response.headers.set("x-nonce", nonce);

    response.cookies.delete("csp-nonce");

    return response;
  },
  {},
);

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/__clerk/') || pathname.startsWith('/clerk-proxy/')) {
    const response = NextResponse.next({ request: { headers: req.headers } });
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    return response;
  }

  return clerkHandler(req);
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};