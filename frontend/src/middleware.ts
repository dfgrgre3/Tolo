import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Pure TypeScript JWT decoder for Next.js Edge runtime compatibility
interface JwtPayload {
  userId?: string;
  role?: string;
  email?: string;
  exp?: number;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const base64Url = parts[1]!;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    
    return JSON.parse(jsonPayload);
  } catch (_e) {
    return null;
  }
}

const ALLOWED_STUDENT_ROLES = ["STUDENT", "TEACHER", "PARENT", "SUPPORT", "ADMIN", "SUPER_ADMIN", "MODERATOR"];

function generateNonce(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  let binary = "";
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]!);
  }
  return btoa(binary);
}

function applyCsp(response: NextResponse, nonce: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isProduction ? '' : " 'unsafe-eval'"} https://*.sentry.io https://*.vercel-insights.com https://*.vercel.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https://*.supabase.co https://*.cloudflarestream.com https://*.youtube.com",
    "connect-src 'self' https: wss:",
    "frame-src 'self' https://*.youtube.com https://*.youtube-nocookie.com https://*.vimeo.com https://*.paymob.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://*.paymob.com",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join('; ');
  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Generate nonce and request headers for document requests (non-API)
  const isApi = pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.');
  const nonce = isApi ? '' : generateNonce();
  const requestHeaders = new Headers(request.headers);
  if (nonce) {
    requestHeaders.set('x-nonce', nonce);
  }

  const protectedRoutes = ['/dashboard', '/admin', '/settings', '/profile', '/courses'];
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  const guestRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
  const isGuestRoute = guestRoutes.some((route) => pathname.startsWith(route));

  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // 1. Guest Redirect logic: If authenticated, redirect away from guest auth pages
  if (isGuestRoute && (accessToken || refreshToken)) {
    try {
      let payload = accessToken ? decodeJwt(accessToken) : null;
      const isValidAccess = payload && payload.exp && (payload.exp * 1000 > Date.now());
      if (isValidAccess || refreshToken) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch {
      // Allow them to access guest pages if decoding fails
    }
  }

  if (isProtected) {
    // 2. Check for token presence
    if (!accessToken && !refreshToken) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    let payload: JwtPayload | null = null;
    let shouldRefresh = false;

    if (accessToken) {
      payload = decodeJwt(accessToken);
      if (payload && payload.exp) {
        // Check if access token is expired (with 10-second clock skew buffer)
        const isExpired = payload.exp * 1000 - 10000 < Date.now();
        if (isExpired) {
          shouldRefresh = true;
        }
      } else {
        shouldRefresh = true;
      }
    } else {
      shouldRefresh = true;
    }

    // 2. Perform silent token rotation if needed and refresh token is present
    let nextResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    if (shouldRefresh && refreshToken) {
      let backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082";
      backendUrl = backendUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");
      
      const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
      const userAgent = request.headers.get("user-agent") || "";
      
      try {
        const headers: Record<string, string> = {
          "Cookie": `refresh_token=${refreshToken}`,
          "Content-Type": "application/json",
        };
        if (clientIp) {
          headers["X-Forwarded-For"] = clientIp;
        }
        if (userAgent) {
          headers["User-Agent"] = userAgent;
        }

        const refreshRes = await fetch(`${backendUrl}/api/auth/refresh`, {
          method: "POST",
          headers,
        });

        if (refreshRes.ok) {
          // Parse cookies from backend refresh response and forward them to the client
          const setCookies = refreshRes.headers.getSetCookie();
          if (setCookies && setCookies.length > 0) {
            for (const cookie of setCookies) {
              nextResponse.headers.append("Set-Cookie", cookie);
            }

            // Also parse new access token to verify claims
            const data = await refreshRes.json();
            if (data?.data?.accessToken) {
              payload = decodeJwt(data.data.accessToken);
            }
          }
        } else {
          // If refresh fails, clear invalid tokens and redirect to login
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('redirect', pathname);
          loginUrl.searchParams.set('error', 'session_expired');
          const redirectRes = NextResponse.redirect(loginUrl);
          redirectRes.cookies.delete('access_token');
          redirectRes.cookies.delete('refresh_token');
          return redirectRes;
        }
      } catch (_err) {
        // Network error during refresh, allow request to fail gracefully in UI or return error
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Service unavailable during session verification" }, { status: 503 });
        }
      }
    }

    // 3. Verify Decoded JWT payload and Role Authorization
    if (!payload || !payload.role || !ALLOWED_STUDENT_ROLES.includes(payload.role)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Access Denied: Insufficient Permissions" }, { status: 403 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'insufficient_permissions');
      const redirectRes = NextResponse.redirect(loginUrl);
      // Clear cookies to prevent redirect loops
      redirectRes.cookies.delete('access_token');
      redirectRes.cookies.delete('refresh_token');
      return redirectRes;
    }

    // 4. Admin layout guards
    if (pathname.startsWith('/admin')) {
      const allowedAdminRoles = ["ADMIN", "SUPER_ADMIN", "MODERATOR"];
      if (!allowedAdminRoles.includes(payload.role)) {
        return NextResponse.redirect(new URL('/access-denied', request.url));
      }
    }

    // Return the response containing updated set-cookie headers (if rotated successfully)
    return nonce ? applyCsp(nextResponse, nonce) : nextResponse;
  }

  const finalResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  return nonce ? applyCsp(finalResponse, nonce) : finalResponse;
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};