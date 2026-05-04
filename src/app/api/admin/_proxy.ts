import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import {
  BACKEND_URL,
  backendJsonResponse,
  upstreamAuthHeaders,
} from '@/app/api/auth/_utils';

/**
 * Server-side proxy to the Go API with the same auth as the browser (cookies + optional Authorization).
 */
export async function forwardToGoApi(
  request: NextRequest,
  apiPath: string,
  init: RequestInit = {},
): Promise<NextResponse> {
  const url = new URL(request.url);
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  const target = `${BACKEND_URL}${path}${url.search}`;

  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(upstreamAuthHeaders(request))) {
    headers.set(key, value);
  }

  if (
    init.body &&
    typeof init.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(target, {
    ...init,
    headers,
    cache: 'no-store',
  });

  return backendJsonResponse(response);
}
