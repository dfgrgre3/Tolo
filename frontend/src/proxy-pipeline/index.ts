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
import { applyRoleGate, isApiRequest, isGuestPage, isProtectedPage, isPublicApiPath } from './routing';
import { isAdminRoute } from '@/lib/auth/route-guards';
import { isStaffAdminPanelRole } from '@/lib/auth/admin-panel-roles';
import { canonicalizeCourseUrl } from './course-canonical-redirect';

export async function runProxyPipeline(request: NextRequest): Promise<NextResponse> {
  const { pathname, nonce, requestHeaders } = createProxyContext(request);

  // Canonicalize legacy /courses/<uuid> links to the slug URL with a 301 before
  // any session work, so a stale link spends no auth budget on a redirect.
  const canonicalRedirect = await canonicalizeCourseUrl(request);
  if (canonicalRedirect) {
    return finalizeProxyResponse(canonicalRedirect, nonce);
  }

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
    // Tracks whether the refresh failure (if any) was transient
    // (backend 5xx/429/network/timeout) vs definitive (401/403 = dead
    // session). Transient failures MUST preserve cookies — wiping them
    // here would force-logout a user whose session is still valid just
    // because the backend had a bad moment while they visited /login.
    let refreshTransient = false;

    if (!valid && refreshToken) {
      const result = await refreshSession(request, refreshToken);
      if (result.payload && result.cookies.length > 0) {
        payload = result.payload;
        valid = true;
        refreshCookies = result.cookies;
      } else {
        refreshTransient = result.transient === true;
      }
    }

    if (valid) {
      const redirectUrl = sanitizeRedirectPath(request.nextUrl.searchParams.get('redirect'));
      const response = NextResponse.redirect(new URL(redirectUrl, request.url));
      if (refreshCookies.length > 0) appendRefreshCookies(response, refreshCookies);
      return finalizeProxyResponse(response, nonce);
    }

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    // Definitive rejection (or no refresh token to try) → stale cookies are
    // dead weight; clear so later requests stop retrying them. Transient
    // backend failure → preserve: the session may still be valid and the
    // next navigation will retry the refresh.
    if (!refreshTransient) clearAuthCookies(response);
    return finalizeProxyResponse(response, nonce);
  }

  let session: SessionState = {
    payload: null,
    refreshAttempted: false,
    refreshCookies: [],
    refreshTransient: false,
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
        refreshTransient: result.transient === true,
        refreshStatus: result.status,
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
    } else if (!session.refreshTransient) {
      // Definitive rejection only. On transient backend failure the 401
      // still stands for THIS request, but cookies are preserved so the
      // client's next request retries instead of starting logged-out.
      clearAuthCookies(response);
    }
    return finalizeProxyResponse(response, nonce);
  }

  // Coarse role gate for endpoints declared in ROLE_RULES (e.g. teacher-only,
  // student-only). Extracted to applyRoleGate (P0-7). Fast-path check; backend re-validates.
  const roleGateResponse = applyRoleGate(pathname, session.payload?.role, isPublicEndpoint);
  if (roleGateResponse) {
    return roleGateResponse;
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
        refreshTransient: result.transient === true,
        refreshStatus: result.status,
      };
      if (session.refreshCookies.length === 0) {
        // The backend produced no rotation for this refresh attempt.
        // Definitive rejection (expired/revoked refresh token) → force a
        // fresh login and clear the stale cookies to stop every subsequent
        // request from retrying the same dead refresh token.
        // Transient failure (network failure, timeout, backend 5xx) →
        // redirect to login WITHOUT clearing: the session may still be
        // valid and the next navigation will retry the refresh instead
        // of starting from a wiped, logged-out state.
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        loginUrl.searchParams.set('error', 'session_expired');
        const response = NextResponse.redirect(loginUrl);
        if (!session.refreshTransient) clearAuthCookies(response);
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

    // Gate closed: reaching here without a verified (or just-rotated) session
    // means either there was no refresh token to try, or the refresh attempt
    // ran but produced neither a usable payload nor rotated cookies. Either
    // way there is no trustworthy session — force login instead of letting
    // the page render for an anonymous/expired visitor.
    const hasVerifiedSession =
      hasValidPayload(session.payload, 10_000) ||
      (session.refreshAttempted && session.refreshCookies.length > 0);
    if (!hasVerifiedSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('error', 'session_expired');
      const response = NextResponse.redirect(loginUrl);
      // Same transient rule as above: a definitive miss clears the dead
      // cookies; a transient backend failure preserves them for retry.
      if (!session.refreshTransient) clearAuthCookies(response);
      return response;
    }

    if (session.accessToken || session.refreshToken) {
      applyRefreshToRequest(requestHeaders, session);
    }

    // Fast-path page gate only. The backend's /api/v1/admin authorization
    // remains authoritative and re-checks role/permissions on every request.
    if (isAdminRoute(pathname) && !isStaffAdminPanelRole(session.payload?.role)) {
      const response = NextResponse.redirect(new URL('/dashboard', request.url));
      if (session.refreshCookies.length > 0) appendRefreshCookies(response, session.refreshCookies);
      return finalizeProxyResponse(response, nonce);
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
