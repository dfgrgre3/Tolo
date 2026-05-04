import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

type HeaderWithSetCookie = Headers & {
  getSetCookie?: () => string[];
  raw?: () => Record<string, string[]>;
};

export const BACKEND_URL = (() => {
  const url = (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:8082'
  ).replace(/\/api$/, '');
  
  // Ensure protocol
  if (!url.startsWith('http')) {
    return `http://${url}`;
  }
  return url;
})();

/** Forward browser session / bearer token to the Go API (matches client `apiClient` + `credentials: 'include'`). */
export function upstreamAuthHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  const cookie = request.headers.get('cookie');
  if (cookie) headers.Cookie = cookie;
  const authorization = request.headers.get('authorization');
  if (authorization) headers.Authorization = authorization;
  return headers;
}

function splitCombinedSetCookie(value: string): string[] {
  return value.split(/,(?=\s*[^;,]+=)/).map((cookie) => cookie.trim()).filter(Boolean);
}

export function forwardSetCookie(source: Response, target: NextResponse): void {
  const headers = source.headers as HeaderWithSetCookie;
  const cookies =
    headers.getSetCookie?.() ??
    headers.raw?.()['set-cookie'] ??
    splitCombinedSetCookie(headers.get('set-cookie') || '');

  for (const cookie of cookies) {
    target.headers.append('Set-Cookie', cookie);
  }
}

export async function backendJsonResponse(response: Response): Promise<NextResponse> {
  const text = await response.text();
  let payload: unknown = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text };
    }
  }

  if (!response.ok) {
    console.error(`[API Proxy] Backend returned error ${response.status}: ${text.substring(0, 100)}`);
  }

  const nextResponse = NextResponse.json(payload, { status: response.status });
  forwardSetCookie(response, nextResponse);
  return nextResponse;
}
