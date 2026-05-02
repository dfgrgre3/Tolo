import { NextResponse } from 'next/server';

type HeaderWithSetCookie = Headers & {
  getSetCookie?: () => string[];
  raw?: () => Record<string, string[]>;
};

export const BACKEND_URL = (
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8080'
).replace(/\/api$/, '');

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

  const nextResponse = NextResponse.json(payload, { status: response.status });
  forwardSetCookie(response, nextResponse);
  return nextResponse;
}
