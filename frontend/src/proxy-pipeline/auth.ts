import type { NextRequest } from 'next/server';
import { attemptTokenRefresh, verifyAccessToken, type AccessTokenPayload } from '@/lib/auth/jwt-edge';

export type RefreshResult = Awaited<ReturnType<typeof attemptTokenRefresh>>;

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
  return attemptTokenRefresh(refreshToken, request);
}
