'use client';

/**
 * Session-only identity helpers.
 *
 * The user's identity comes exclusively from the authenticated session
 * (JWT → /auth/me). Nothing is cached in localStorage and no guest identity
 * is fabricated client-side: endpoints resolve the caller server-side from
 * the token, so a client-supplied userId must never influence which user's
 * data is read or written (IDOR/BOLA hardening).
 */

import { logger } from '@/lib/logger';
import { apiClient } from '@/lib/api/api-client';

const LEGACY_USER_KEY = 'tw_user_id';

function normalizeUserId(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null' || lowered === 'nan') {
    return null;
  }

  return trimmed;
}

// One-time cleanup of the legacy client-side identity cache: the session is
// now the single source of identity and nothing reads this key anymore.
if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem(LEGACY_USER_KEY);
  } catch {
    // Ignore storage access failures (private mode, disabled storage, …)
  }
}

/**
 * Resolve the current session's user id from the server.
 *
 * Returns an empty string when there is no authenticated session — callers
 * must treat that as "no identity" instead of fabricating a local one.
 */
export async function ensureUser(): Promise<string> {
  try {
    const data = await apiClient.get<any>('/auth/me');
    return normalizeUserId(data?.user?.id) ?? '';
  } catch (error) {
    logger.warn('Unexpected error reading authenticated user:', error);
    return '';
  }
}
