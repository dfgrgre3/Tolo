import { NextResponse } from 'next/server';
import type { SessionState } from './auth';
import { appendRefreshCookies, updateCookieHeader } from './cookies';
import { finalizeProxyResponse } from './csp';

export function applyRefreshToRequest(
  requestHeaders: Headers,
  session: SessionState,
): void {
  updateCookieHeader(requestHeaders, session.accessToken, session.refreshToken);
}

export function createRefreshedResponse(
  requestHeaders: Headers,
  session: SessionState,
  nonce: string,
): NextResponse {
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  appendRefreshCookies(response, session.refreshCookies);
  return finalizeProxyResponse(response, nonce);
}
