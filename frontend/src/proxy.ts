import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 1. الإعدادات العامة وفلاتر المسارات (Global Configuration)
// تشمل مسارات الصفحات ومسارات الـ API المحلية الحساسة التي تتطلب مصادقة (Authentication).
// تنبيه: المسارات الموجهة للخلفية (Go API) يتم تمريرها وحمايتها في الخلفية مباشرة،
// أما مسارات Next.js API المحلية الحساسة فيجب إضافتها هنا لمنع أي تجاوز.
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
  // مسارات الـ API المحلية الحساسة داخل Next.js (مثل إبطال الكاش)
  "/api/cache/revalidate(.*)",
]);

const isDev = process.env.NODE_ENV === 'development';

/**
 * دالة مساعدة معزولة ومحسنة لاستخراج نطاق الموقع (Origin) بأمان وفائدتها تسريع وقت المعالجة.
 */
const getDomainFromUrl = (url: string | undefined): string => {
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
};

/**
 * توليد مفتاح عشوائي فريد (Nonce) متوافق تماماً مع بيئة Vercel Edge Runtime الحساسة وسريع جداً.
 */
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
      // نظام تراجع صامت وآمن
    }
  }
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}

// 2. تصدير برمجية الوسيط الأساسية (Main Middleware Execution)
export const proxy = clerkMiddleware(
  async (auth, req) => {
    const url = req.nextUrl || new URL(req.url);

    // ── Pass-through: npm bundle requests → local route handler ───────
    // The /__clerk/npm/* path is handled by src/app/__clerk/[...path]/route.ts
    // which proxies to jsDelivr CDN. clerkMiddleware doesn't handle these
    // and would return 404. Return next() so the request reaches the route.
    if (url.pathname.startsWith('/__clerk/npm/')) {
      return NextResponse.next();
    }

    const isAuthPage = ["/login", "/register", "/admin-login"].includes(url.pathname);

    // [إصلاح جوهري]: حماية المسارات المطلوبة فوراً عبر Clerk لتفادي استدعاء الدالة المزدوج
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

    // [تحسين أداء أمني]: تجاوز سياسات الـ CSP وتوليد الـ Nonce لطلبات الـ API وبروكسي Clerk
    // لكونها لا تحتاج لعرض HTML ولا تشغل نصوص برمجية (Scripts).
    const isApiOrClerk = url.pathname.startsWith('/api') || 
                         url.pathname.startsWith('/trpc') || 
                         url.pathname.startsWith('/__clerk');

    if (isApiOrClerk) {
      const response = NextResponse.next();
      
      // Add strict no-cache headers for Clerk API requests to prevent
      // Service Worker from intercepting and caching them
      if (url.pathname.startsWith('/__clerk/')) {
        response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        response.headers.set('Surrogate-Control', 'no-store');
      }
      
      return response;
    }

    // [إصلاح جوهري]: التحقق من حالة الدخول فقط عند زيارة صفحات التسجيل لمنع حلقات التوجيه اللانهائية
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
          // كسر الحلقة وتمرير الطلب لحماية الخادم من التوقف
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

    // 3. تطبيق قواعد الأمان وحقن سياسات الـ CSP (Content Security Policy)
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

    // تجميع مصادر الروابط المسموح بالاتصال بها ديناميكياً
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

      // بناء نص الـ CSP النهائي والمعياري للمتصفحات
    const cspHeader = [
      "default-src 'self'",
      // 'strict-dynamic': nonce-trusted scripts can load further scripts dynamically (required for Clerk bootstrap).
      // URL-based sources in script-src are IGNORED when 'strict-dynamic' is present (CSP Level 2+ spec).
      // 'unsafe-inline' is ignored by browsers that support nonces/hashes (CSP Level 2+), but
      // sha256 hashes are required for any inline scripts injected by Next.js/Sentry/libraries.
      // The hash below covers the inline script that violates CSP (browser provides the hash in the error).
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

    // إعداد وتمرير الـ Headers إلى الـ Server Components وضمن الاستجابة (Response) للمتصفح
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
    
    // تنظيف كوكيز الـ nonce القديمة تجنباً لأي تعارض برمجي في المتصفح
    response.cookies.delete("csp-nonce");

    return response;
  },
  {},
);

export const config = {
  matcher: [
    // تخطي قراءة الملفات الثابتة لتسريع الأداء وتجنب استهلاك معالج خادم Vercel
    "/((?!_next|[^?]*\\.(?:html?|css|js|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // تفعيل دائم لروابط الـ API والـ TRPC الخلفية
    "/(api|trpc)(.*)",
    // Clerk proxy path — ضروري لتمرير طلبات Clerk عبر الـ proxy
    "/__clerk/:path*",
  ],
};