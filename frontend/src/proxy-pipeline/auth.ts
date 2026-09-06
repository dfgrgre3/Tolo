import type { NextRequest } from 'next/server';
import { attemptTokenRefresh, verifyAccessToken, type AccessTokenPayload } from '@/lib/auth/jwt-edge';

export type RefreshResult = Awaited<ReturnType<typeof attemptTokenRefresh>>;

// A page load can fan out into many protected API requests at once. Without
// request coalescing, every middleware invocation sees the same expired cookie
// and calls the backend refresh endpoint independently. A revoked token then
// becomes a 401 -> 429 storm before the first response has time to clear the
// browser cookies.
const inFlightRefreshes = new Map<string, Promise<RefreshResult>>();
const failedRefreshes = new Map<string, number>();
const FAILED_REFRESH_COOLDOWN_MS = 2_000;

export interface SessionState {
  payload: AccessTokenPayload | null;
  refreshAttempted: boolean;
  refreshCookies: string[];
  accessToken?: string;
  refreshToken?: string;
}

export function hasValidPayload(
  payload: AccessTokenPayload | null,
  clockSkewMs = 0,
): boolean {
  return !!(payload?.exp && payload.exp * 1000 - clockSkewMs > Date.now());
}

export async function verifySession(accessToken?: string): Promise<AccessTokenPayload | null> {
  return accessToken ? verifyAccessToken(accessToken) : null;
}

export async function refreshSession(
  request: NextRequest,
  refreshToken: string,
): Promise<RefreshResult> {
  const now = Date.now();
  const failedUntil = failedRefreshes.get(refreshToken);
  if (failedUntil !== undefined) {
    if (failedUntil > now) {
      return { payload: null, cookies: [] };
    }
    failedRefreshes.delete(refreshToken);
  }

  const existing = inFlightRefreshes.get(refreshToken);
  if (existing) return existing;

  const refresh = attemptTokenRefresh(refreshToken, request)
    .then((result) => {
      if (!result.payload || result.cookies.length === 0) {
        failedRefreshes.set(refreshToken, Date.now() + FAILED_REFRESH_COOLDOWN_MS);
      }
      return result;
    })
    .finally(() => {
      inFlightRefreshes.delete(refreshToken);
    });

  inFlightRefreshes.set(refreshToken, refresh);
  return refresh;
}
