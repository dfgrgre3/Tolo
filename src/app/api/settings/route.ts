import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { BACKEND_URL, forwardSetCookie } from '@/app/api/auth/_utils';

/** Mirrors Go `GetSystemSettings` defaults and `settings-context` fallbacks. */
const DEFAULT_ENVELOPE = {
  success: true as const,
  data: {
    settings: {
      siteName: 'Thanawy',
      siteDescription: 'منصة تعليمية لإدارة التعلم والمحتوى.',
      features: {
        registration: true,
        engagement: true,
        forum: true,
        blog: true,
        events: true,
        aiAssistant: true,
      },
      maintenance: {
        enabled: false,
        message: '',
      },
    },
  },
};

function backendOriginCandidates(): string[] {
  const primary = BACKEND_URL.replace(/\/+$/, '');
  const set = new Set<string>([primary]);
  if (primary.includes(':8082')) set.add(primary.replace(':8082', ':8080'));
  else if (primary.includes(':8080')) set.add(primary.replace(':8080', ':8082'));
  return [...set];
}

function hasValidSettingsPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return false;
  return typeof (data as { settings?: unknown }).settings === 'object';
}

/**
 * Public system settings: prefer Go API, but never fail the app if the rewrite/upstream
 * is misconfigured (common local mismatch: Go default 8080 vs Next default 8082).
 */
export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') ?? '';

  for (const origin of backendOriginCandidates()) {
    try {
      const res = await fetch(`${origin}/api/settings`, {
        method: 'GET',
        headers: { cookie },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) continue;

      const text = await res.text();
      let payload: unknown = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        continue;
      }

      if (!hasValidSettingsPayload(payload)) continue;

      const next = NextResponse.json(payload, { status: 200 });
      forwardSetCookie(res, next);
      return next;
    } catch {
      /* try next origin */
    }
  }

  return NextResponse.json(DEFAULT_ENVELOPE);
}
