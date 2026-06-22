import { auth } from '@clerk/nextjs/server';
import { cache } from 'react';
import { AuthUser } from './session';

/**
 * Fetches the full user profile from the backend API, cached per-request.
 * Returns null if the user is not authenticated or the API call fails.
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const { userId, getToken } = await auth();

  if (!userId) return null;

  try {
    const token = await getToken();
    if (!token) return null;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      console.error('[getAuthUser] NEXT_PUBLIC_API_URL is not configured');
      return null;
    }

    const res = await fetch(`${apiUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // No caching — always fetch fresh auth state for security
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status !== 401 && res.status !== 403) {
        console.error(`[getAuthUser] API returned ${res.status}`);
      }
      return null;
    }

    const data = await res.json();
    return data.user as AuthUser ?? null;
  } catch (err) {
    console.error('[getAuthUser] Failed to fetch user profile:', err);
    return null;
  }
});

/**
 * Gets just the Clerk token, cached per-request.
 * Useful for making authenticated API calls in Server Components without
 * fetching the full user profile.
 */
export const getClerkToken = cache(async (): Promise<string | null> => {
  const { getToken } = await auth();
  return getToken();
});
