import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { type ClerkSessionClaims, resolveClerkRole, isAdminRole } from "@/lib/auth/roles";
import { generateNonce, getCSPHeader } from "@/lib/auth/security";

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
const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/login';
const signInFallbackRedirectUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL || '/dashboard';
const signUpFallbackRedirectUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || signInFallbackRedirectUrl;

// Detect RSC and data prefetch requests — these MUST not redirect or call auth.protect()
// because doing so prevents React from hydrating the server component payload.
function isRSCRequest(req: NextRequest): boolean {
  return req.headers.get('RSC') === '1' ||
    req.headers.get('Next-Router-State-Tree') !== null ||
    req.headers.get('next-router-prefetch') === '1' ||
    req.headers.get('x-nextjs-data') === '1';
}

const clerkHandler = clerkMiddleware(
  async (auth, req) => {
    const url = req.nextUrl || new URL(req.url);

    // CRITICAL: For RSC and prefetch requests, skip auth.protect() entirely.
    // auth.protect() throws a redirect response which breaks RSC payload loading,
    // causing "Failed to fetch RSC payload" errors in the browser.
    // Instead, just try to get auth state without throwing, and let the client-side
    // Clerk handle the redirect via the SignInButton / useAuth() hook.
    const isRsc = isRSCRequest(req);

    const isAuthPage = ["/login", "/register", "/admin-login"].includes(url.pathname);

    if (isProtectedRoute(req)) {
      if (isRsc) {
        // For RSC/prefetch requests, get auth state without protect() to avoid
        // breaking the React Server Component loading pipeline.
        // Single auth() call — destructure everything needed at once.
        const { userId, sessionClaims } = await auth();
        if (!userId) {
          // Return a 401 response for RSC requests when unauthenticated,
          // allowing the client to redirect the user gracefully:
          return new NextResponse('Unauthorized', { status: 401, headers: { 'x-middleware-request-unauthorized': '1' } });
        }
        // Check admin role for admin routes
        if (url.pathname.startsWith("/admin")) {
          const role = resolveClerkRole(sessionClaims as ClerkSessionClaims);
          if (!isAdminRole(role)) {
            return new NextResponse('Forbidden', { status: 403, headers: { 'x-middleware-request-forbidden': '1' } });
          }
        }
      } else {
        // Regular navigation — single auth() call covers both authentication AND
        // role extraction, avoiding a second round-trip to Clerk.
        const { userId, sessionClaims } = await auth();

        if (!userId) {
          // auth.protect() would redirect here — we replicate that behaviour
          // manually so we can capture sessionClaims in the same call.
          return NextResponse.redirect(new URL(signInUrl, req.url));
        }

        if (url.pathname.startsWith("/admin")) {
          const role = resolveClerkRole(sessionClaims as ClerkSessionClaims);
          if (!isAdminRole(role)) {
            return NextResponse.redirect(new URL("/unauthorized", req.url));
          }
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
        const destination = url.pathname === "/admin-login" ? "/admin/dashboard" : signInFallbackRedirectUrl || signUpFallbackRedirectUrl;

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
    const cspHeader = getCSPHeader(nonce, isDev, url);

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

// Clerk cookie names that may carry a stale session from a previous Clerk instance.
const CLERK_STALE_COOKIE_NAMES = [
  '__session',
  '__client_uat',
  '__clerk_db_jwt',
  '__dev_session',
  '__clerk_handshake',
  '__clerk_redirect_count',
];

function clearClerkCookiesAndRedirect(req: NextRequest, destination: string): NextResponse {
  const response = NextResponse.redirect(new URL(destination, req.url));
  for (const name of CLERK_STALE_COOKIE_NAMES) {
    // Delete with both the default path and root path to be thorough.
    response.cookies.delete({ name, path: '/' });
  }
  return response;
}

export async function proxy(req: NextRequest, event: any) {
  const url = req.nextUrl.pathname;

  // Note: /__clerk/* requests are rewritten to /clerk-proxy/* by next.config rewrites,
  // so the middleware never sees /__clerk paths in production.
  //
  // CRITICAL: Skip Clerk middleware for /clerk-proxy/ requests entirely.
  // clerkMiddleware intercepts these requests and attempts to process them as
  // Clerk Frontend API calls (dev-browser-sync handshake, etc.), corrupting the
  // request and returning 400 Bad Request. The route handler at
  // /clerk-proxy/[...path]/route.ts handles these requests correctly by proxying
  // them to the upstream Clerk Frontend API with proper headers/cookies.
  if (url.startsWith('/clerk-proxy/')) {
    const nonce = generateNonce();
    const cspHeader = getCSPHeader(nonce, false, req.nextUrl);

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

    return response;
  }

  try {
    return await clerkHandler(req, event);
  } catch (err: any) {
    // Detect stale Clerk session cookies from a different Clerk instance.
    // This happens when the publishable key / secret key changes but the browser
    // still holds an __session cookie signed by the old instance's private key.
    // The kid (key ID) in the old JWT won't match any key in the new JWKS,
    // causing a hard runtime error instead of a graceful redirect.
    const isKidMismatch =
      err?.reason === 'jwk-kid-mismatch' ||
      err?.clerkError === true && err?.message?.includes('kid') ||
      String(err?.message ?? '').includes('jwk-kid-mismatch') ||
      String(err?.message ?? '').includes('kid-mismatch');

    if (isKidMismatch) {
      console.warn(
        '[Clerk] jwk-kid-mismatch detected — clearing stale session cookies and redirecting to sign-in.',
        err?.message,
      );
      return clearClerkCookiesAndRedirect(req, signInUrl);
    }

    // Re-throw any other unexpected errors so they are handled normally.
    throw err;
  }
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
    "/clerk-proxy/:path*",
  ],
};
