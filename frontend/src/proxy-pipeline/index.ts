import { NextResponse, type NextRequest } from 'next/server';
import { sanitizeRedirectPath } from '@/services/auth/navigation';
import { createProxyContext, finalizeProxyResponse } from './csp';
import { appendRefreshCookies, clearAuthCookies } from './cookies';
import {
  hasValidPayload,
  refreshSession,
  verifySession,
  type SessionState,
} from './auth';
import { applyRefreshToRequest, createRefreshedResponse } from './refresh';
import { isApiRequest, isGuestPage, isProtectedPage, isPublicApiPath } from './routing';
import { findRoleRule, hasRole } from '@/lib/auth/route-guards';

export async function runProxyPipeline(request: NextRequest): Promise<NextResponse> {
  const { pathname, nonce, requestHeaders } = createProxyContext(request);
  const isProtected = isProtectedPage(pathname);
  const isGuest = isGuestPage(pathname);
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  if (isGuest && (accessToken || refreshToken)) {
    let payload = await verifySession(accessToken);
    let refreshCookies: string[] = [];
    // Same 10s clock-skew margin used for protected pages/APIs below: a
    // token that verifies but expires within the next 10s should still be
    // refreshed rather than treated as a valid session, otherwise the user
    // gets redirected off the guest page onto a session that dies almost
    // immediately.
    let valid = hasValidPayload(payload, 10_000);

    if (!valid && refreshToken) {
      const result = await refreshSession(request, refreshToken);
      if (result.payload && result.cookies.length > 0) {
        payload = result.payload;
        valid = true;
        refreshCookies = result.cookies;
      }
    }

    if (valid) {
      const redirectUrl = sanitizeRedirectPath(request.nextUrl.searchParams.get('redirect'));
      const response = NextResponse.redirect(new URL(redirectUrl, request.url));
      if (refreshCookies.length > 0) appendRefreshCookies(response, refreshCookies);
      return finalizeProxyResponse(response, nonce);
    }

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    clearAuthCookies(response);
    return finalizeProxyResponse(response, nonce);
  }

  let session: SessionState = {
    payload: null,
    refreshAttempted: false,
    refreshCookies: [],
  };
  const isPublicEndpoint = isPublicApiPath(pathname);

  if (isApiRequest(pathname) && !isPublicEndpoint) {
    session.payload = await verifySession(accessToken);
    const expired = !hasValidPayload(session.payload, 10_000);
    if (expired && refreshToken) {
      const result = await refreshSession(request, refreshToken);
      session = {
        payload: result.payload,
        refreshAttempted: true,
        refreshCookies: result.cookies,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };
    }
  }

  if (session.refreshAttempted && session.refreshCookies.length > 0 && session.payload) {
    applyRefreshToRequest(requestHeaders, session);
    return createRefreshedResponse(requestHeaders, session, nonce);
  }

  // A refresh was attempted but did not produce a valid session for this
  // request. The current request still fails (its token could not be
  // verified in time), but if the backend rotated the refresh token
  // (Set-Cookie present) that rotation already happened server-side —
  // relay the new cookies so the client's *next* request succeeds instead
  // of retrying a session the backend just replaced. Only clear cookies
  // outright when the backend produced no rotation at all, otherwise every
  // following request would retry the same dead refresh token (401 ->
  // refresh storm, eventually tripping the backend rate limiter).
  if (session.refreshAttempted && isApiRequest(pathname)) {
    const response = NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
    if (session.refreshCookies.length > 0) {
      appendRefreshCookies(response, session.refreshCookies);
    } else {
      clearAuthCookies(response);
    }
    return finalizeProxyResponse(response, nonce);
  }

  // Coarse role gate for endpoints declared in ROLE_RULES (e.g. teacher-only,
  // student-only). This is a fast-path only — the backend re-validates roles
  // on every request and remains the authority.
  if (isApiRequest(pathname) && !isPublicEndpoint) {
    const roleRule = findRoleRule(pathname);
    if (roleRule && !hasRole(session.payload?.role, roleRule.allowedRoles)) {
      return NextResponse.json({ error: roleRule.errorMessage }, { status: 403 });
    }
  }

  if (isProtected) {
    if (!accessToken && !refreshToken) {
      if (isApiRequest(pathname)) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!session.payload && accessToken) {
      session.payload = await verifySession(accessToken);
    }

    const expired = !hasValidPayload(session.payload, 10_000);
    if (expired && refreshToken && !session.refreshAttempted) {
      const result = await refreshSession(request, refreshToken);
      session = {
        payload: result.payload,
        refreshAttempted: true,
        refreshCookies: result.cookies,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };
      if (session.refreshCookies.length === 0) {
        // The backend never rotated anything for this refresh attempt (network
        // failure, expired/revoked refresh token, timeout) — there is no new
        // session to fall back on, so force a fresh login and clear the stale
        // cookies to stop every subsequent request from retrying the same
        // dead refresh token.
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        loginUrl.searchParams.set('error', 'session_expired');
        const response = NextResponse.redirect(loginUrl);
        clearAuthCookies(response);
        return response;
      }

      // If session.payload is still null here, the backend rotated the
      // session (Set-Cookie present) but the new access token could not be
      // verified locally (e.g. transient decode failure). The rotation
      // already happened server-side, so this request falls through to the
      // normal render path below, which forwards the new access token on
      // the outgoing request and relays the new Set-Cookie to the browser —
      // without an extra redirect hop, which would risk looping if the new
      // token is deterministically unverifiable (no Edge-level loop guard
      // exists here, unlike the client-side one in redirect-loop-guard.ts).
    }

    if (session.accessToken || session.refreshToken) {
      applyRefreshToRequest(requestHeaders, session);
    }
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    if (session.refreshCookies.length > 0) appendRefreshCookies(response, session.refreshCookies);
    return finalizeProxyResponse(response, nonce);
  }

  return finalizeProxyResponse(
    NextResponse.next({ request: { headers: requestHeaders } }),
    nonce,
  );
}
