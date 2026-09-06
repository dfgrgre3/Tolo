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

export async function runProxyPipeline(request: NextRequest): Promise<NextResponse> {
  const { pathname, nonce, requestHeaders } = createProxyContext(request);
  const isProtected = isProtectedPage(pathname);
  const isGuest = isGuestPage(pathname);
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  if (isGuest && (accessToken || refreshToken)) {
    let payload = await verifySession(accessToken);
    let refreshCookies: string[] = [];
    let valid = hasValidPayload(payload);

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
      if (session.refreshCookies.length === 0 || !session.payload) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        loginUrl.searchParams.set('error', 'session_expired');
        const response = NextResponse.redirect(loginUrl);
        clearAuthCookies(response);
        return response;
      }
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
