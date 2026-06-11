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
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Generate dynamic CSP nonce
  const nonce = generateNonce();

  /**
   * سياسة CSP واحدة تطبَّق على جميع المصادر (script-src, style-src, font-src, ...).
   * ملاحظات هامة:
   *  - 'strict-dynamic' يلغي السماح المعتمد على host (تتم المحاسبة على الـ nonce فقط)
   *  - يجب أن تحصل كل سكربت مضمّن (inline) على الـ nonce كي يعمل
   *  - 'unsafe-inline' متعمّد لـ style-src لأن Next.js يحقن styles ديناميكية
   *  - نضيف connect-src لـ clerk حتى تعمل طلباته
   *  - frame-src مسموح لـ youtube و clerk
   *  - worker-src 'self' blob: حتى يعمل Service Worker
   */
  const isDev = process.env.NODE_ENV === 'development';
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval' " : ""}https: https://*.clerk.accounts.dev https://clerk.tolo.app https://*.clerk.com`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com`,
    "img-src 'self' https: data: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "worker-src 'self' blob:",
    "connect-src 'self' https://*.tolo.app https://*.vercel.app https://*.clerk.accounts.dev https://clerk.tolo.app https://*.clerk.com https://*.supabase.co wss: ws:",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.clerk.accounts.dev https://clerk.tolo.app https://*.clerk.com",
    "media-src 'self' https: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self' https://*.tolo.app",
    "upgrade-insecure-requests",
  ].join("; ");

  // Pass the nonce down to Server Components via request headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  // Set the CSP header on the response (also pass the nonce to RSC via
  // request headers so Next.js can forward it to the rendered HTML)
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("Content-Security-Policy", cspHeader);
  // Also expose nonce for client-side needs (Clerk, analytics, etc.)
  response.headers.set("x-nonce", nonce);

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
