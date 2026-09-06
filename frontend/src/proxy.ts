import { NextResponse, type NextRequest } from 'next/server';
import { generateNonce, applyCsp } from '@/lib/security/csp';
import { verifyAccessToken, attemptTokenRefresh } from '@/lib/auth/jwt-edge';
import { sanitizeRedirectPath } from '@/services/auth/navigation';
import {
  forwardSetCookieForDev,
  validateAuthCookieAttributes,
} from '@/lib/security/cookie-attrs';
import {
  ALLOWED_AUTHENTICATED_ROLES,
  ADMIN_PANEL_ROLES,
  isAdminRoute,
  isProtectedRoute,
  isGuestRoute,
  isPublicApiEndpoint,
  hasRole,
  findRoleRule,
} from '@/lib/auth/route-guards';

function updateCookieHeader(headers: Headers, accessToken?: string, refreshToken?: string) {
  if (!accessToken && !refreshToken) return;

  const currentCookies = headers.get('cookie') || '';
  const parsed = new Map<string, string>();

  if (currentCookies) {
    currentCookies.split(';').forEach((c) => {
      const parts = c.split('=');
      const key = parts[0]?.trim();
      if (key && parts.length >= 2) {
        parsed.set(key, parts.slice(1).join('=').trim());
      }
    });
  }

  if (accessToken) {
    parsed.set('access_token', accessToken);
  }
  if (refreshToken) {
    parsed.set('refresh_token', refreshToken);
  }

  const updatedCookieString = Array.from(parsed.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

  headers.set('cookie', updatedCookieString);
}

/**
 * Appends refresh cookies (returned from the Go backend's
 * /auth/refresh-token endpoint) to the outgoing response.
 *
 * Centralized so the dev-only `Secure` strip and auth-cookie
 * attribute validation live in one place. `proxy.ts` previously
 * had three copies of the same loop, each silently trusting the
 * backend's Set-Cookie attributes. This helper validates them.
 */
function appendRefreshCookies(
  response: NextResponse,
  cookies: string[],
): void {
  for (const cookie of cookies) {
    const adjusted = forwardSetCookieForDev(cookie);
    response.headers.append('Set-Cookie', adjusted);
    const violations = validateAuthCookieAttributes(adjusted);
    if (violations.length > 0) {
      // The frontend is a pass-through: even if a backend cookie
      // is missing HttpOnly/Secure, we forward it and rely on
      // Sentry breadcrumbs + backend fixes. Refusing the cookie
      // would lock users out, which is worse than the warning.
      const { addBreadcrumb } = require('@sentry/nextjs') as typeof import('@sentry/nextjs');
      addBreadcrumb({
        category: 'auth.cookie',
        level: 'warning',
        data: {
          violations,
          route: 'proxy',
        },
      });
    }
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Generate nonce and request headers for document requests (non-API)
  const isApi = pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.');
  const nonce = isApi ? '' : generateNonce();
  const requestHeaders = new Headers(request.headers);
  if (nonce) {
    requestHeaders.set('x-nonce', nonce);
  }
  // Add pathname to headers for conditional rendering in layouts
  requestHeaders.set('x-pathname', pathname);

  const isProtected = isProtectedRoute(pathname);
  const isGuest = isGuestRoute(pathname);

  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  let refreshCookies: string[] = [];

  // 1. Guest Redirect logic: If authenticated, redirect away from guest auth pages
  if (isGuest && (accessToken || refreshToken)) {
    let payload = accessToken ? await verifyAccessToken(accessToken) : null;
    let isValidAccess = !!(payload && payload.exp && payload.exp * 1000 > Date.now());

    if (!isValidAccess && refreshToken) {
      const result = await attemptTokenRefresh(refreshToken, request);
      if (result.payload && result.cookies.length > 0) {
        payload = result.payload;
        isValidAccess = true;
        refreshCookies = result.cookies;
      }
    }

    if (isValidAccess) {
      // Only allow safe relative paths — prevents open-redirect via
      // ?redirect=//evil.com or ?redirect=https://evil.com
      const redirectUrl = sanitizeRedirectPath(request.nextUrl.searchParams.get('redirect'));
      const redirectRes = NextResponse.redirect(new URL(redirectUrl, request.url));
      if (refreshCookies.length > 0) {
        appendRefreshCookies(redirectRes, refreshCookies);
      }
      return nonce ? applyCsp(redirectRes, nonce) : redirectRes;
    } else {
      // Clear invalid tokens so user isn't stuck in a redirect loop
      const nextResponse = NextResponse.next({ request: { headers: requestHeaders } });
      nextResponse.cookies.delete('access_token');
      nextResponse.cookies.delete('refresh_token');
      return nonce ? applyCsp(nextResponse, nonce) : nextResponse;
    }
  }

  // 2. Token refresh logic for API requests
  // This handles token refresh for ALL API requests, not just protected routes
  // This ensures that guest pages can still make authenticated API calls
  const isApiRequest = pathname.startsWith('/api/');
  const isPublicEndpoint = isPublicApiEndpoint(pathname);

  let payload: Awaited<ReturnType<typeof verifyAccessToken>> = null;
  let refreshAttempted = false;
  let newAccessToken: string | undefined;
  let newRefreshToken: string | undefined;

  if (isApiRequest && accessToken && !isPublicEndpoint) {
    payload = await verifyAccessToken(accessToken);
    const isExpired = !payload || !payload.exp || (payload.exp * 1000 - 10000 < Date.now());

    if (isExpired && refreshToken) {
      const result = await attemptTokenRefresh(refreshToken, request);
      payload = result.payload;
      refreshCookies = result.cookies;
      newAccessToken = result.accessToken;
      newRefreshToken = result.refreshToken;
      refreshAttempted = true;
    }
  } else if (isApiRequest && !accessToken && refreshToken && !isPublicEndpoint) {
    const result = await attemptTokenRefresh(refreshToken, request);
    payload = result.payload;
    refreshCookies = result.cookies;
    newAccessToken = result.accessToken;
    newRefreshToken = result.refreshToken;
    refreshAttempted = true;
  }

  // If we successfully refreshed and got cookies, return the response with updated cookies
  if (refreshAttempted && refreshCookies.length > 0 && payload) {
    updateCookieHeader(requestHeaders, newAccessToken, newRefreshToken);

    const nextResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    appendRefreshCookies(nextResponse, refreshCookies);

    return nonce ? applyCsp(nextResponse, nonce) : nextResponse;
  }

  // 3. Protected route handling
  if (isProtected) {
    // Check for token presence
    if (!accessToken && !refreshToken) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Decode payload if not already done
    if (!payload && accessToken) {
      payload = await verifyAccessToken(accessToken);
    }

    // Check if token is expired and we haven't tried refresh yet
    const isExpired = !payload || !payload.exp || (payload.exp * 1000 - 10000 < Date.now());
    if (isExpired && refreshToken && !refreshAttempted) {
      const result = await attemptTokenRefresh(refreshToken, request);
      payload = result.payload;
      refreshCookies = result.cookies;
      newAccessToken = result.accessToken;
      newRefreshToken = result.refreshToken;
      refreshAttempted = true;

      if (refreshCookies.length === 0 || !payload) {
        // Refresh failed, redirect to login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        loginUrl.searchParams.set('error', 'session_expired');
        const redirectRes = NextResponse.redirect(loginUrl);
        redirectRes.cookies.delete('access_token');
        redirectRes.cookies.delete('refresh_token');
        return redirectRes;
      }
    }

    // Verify the (signature-verified) JWT payload and role authorization
    if (!hasRole(payload?.role, ALLOWED_AUTHENTICATED_ROLES)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Access Denied: Insufficient Permissions" }, { status: 403 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'insufficient_permissions');
      const redirectRes = NextResponse.redirect(loginUrl);
      redirectRes.cookies.delete('access_token');
      redirectRes.cookies.delete('refresh_token');
      return redirectRes;
    }

    // Admin layout guards
    if (isAdminRoute(pathname)) {
      if (!hasRole(payload?.role, ADMIN_PANEL_ROLES)) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Access Denied: Admin privileges required" }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/access-denied', request.url));
      }
    }

    // Additional API route-specific coarse gating (Defense-in-depth).
    // NOTE (Two-Tier Architecture):
    // Edge provides fast rejection / coarse route gating based on JWT claims.
    // The Go backend is the absolute authority for fine-grained authorization,
    // real-time user status (e.g. suspended accounts), action permissions,
    // and resource ownership / course entitlement.
    //
    // The rule table lives in `route-guards.ts` (ROLE_RULES) so adding a
    // new role-gated endpoint is a one-line change there — no proxy edit.
    if (pathname.startsWith("/api/")) {
      const roleRule = findRoleRule(pathname);
      if (roleRule && !hasRole(payload?.role, roleRule.allowedRoles)) {
        return NextResponse.json({ error: roleRule.errorMessage }, { status: 403 });
      }
    }

    if (newAccessToken || newRefreshToken) {
      updateCookieHeader(requestHeaders, newAccessToken, newRefreshToken);
    }

    // Return the response containing updated set-cookie headers (if rotated successfully)
    const nextResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Add refresh cookies if we have them from protected route refresh
    if (refreshCookies.length > 0) {
      appendRefreshCookies(nextResponse, refreshCookies);
    }

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
