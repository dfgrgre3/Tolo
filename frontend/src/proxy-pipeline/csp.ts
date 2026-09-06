import { NextRequest, NextResponse } from 'next/server';
import { applyCsp, generateNonce } from '@/lib/security/csp';

export interface ProxyContext {
  pathname: string;
  nonce: string;
  requestHeaders: Headers;
}

export function createProxyContext(request: NextRequest): ProxyContext {
  const { pathname } = request.nextUrl;
  const isStaticOrApi = pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.');
  const nonce = isStaticOrApi ? '' : generateNonce();
  const requestHeaders = new Headers(request.headers);
  if (nonce) requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-pathname', pathname);
  return { pathname, nonce, requestHeaders };
}

export function finalizeProxyResponse(response: NextResponse, nonce: string): NextResponse {
  return nonce ? applyCsp(response, nonce) : response;
}
