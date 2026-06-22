 'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useClerkAuth, useUser as useClerkUser, useClerk } from '@clerk/nextjs';
import { useAuthStore, type AuthUser, isAdminRole, resolveClerkRole } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { authRepository } from '@/data-access/repositories/auth-repository';

// Helper to extract Clerk error messages safely without using 'any'
function getClerkErrorMessage(err: unknown, fallback: string): string {
  let message = '';
  if (err && typeof err === 'object') {
    const clerkErr = err as { errors?: { message?: string }[]; message?: string };
    if (Array.isArray(clerkErr.errors) && clerkErr.errors.length > 0) {
      message = clerkErr.errors[0]?.message || '';
    } else if (typeof clerkErr.message === 'string') {
      message = clerkErr.message;
    }
  }

  if (!message) return fallback;

  // Map common English Clerk messages to Arabic
  const msgLower = message.toLowerCase();
  if (msgLower.includes('password is incorrect')) {
    return 'كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.';
  }
  if (msgLower.includes("couldn't find your account") || msgLower.includes('identifier is invalid') || msgLower.includes('could not find user')) {
    return 'البريد الإلكتروني غير مسجل لدينا أو غير صحيح.';
  }
  if (msgLower.includes('already in use') || msgLower.includes('already exists')) {
    return 'البريد الإلكتروني أو اسم المستخدم مسجل بالفعل.';
  }
  if (msgLower.includes('too many requests') || msgLower.includes('rate limit') || msgLower.includes('too many login attempts')) {
    return 'تم إجراء محاولات كثيرة جداً. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
  }
  if (msgLower.includes('password is too short') || msgLower.includes('password must be')) {
    return 'كلمة المرور ضعيفة جداً أو قصيرة للغاية.';
  }
  if (msgLower.includes('incorrect code') || msgLower.includes('invalid code') || msgLower.includes('code is incorrect')) {
    return 'رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.';
  }
  if (msgLower.includes('code has expired') || msgLower.includes('expired code')) {
    return 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.';
  }
  if (msgLower.includes('verification strategy is not valid') || msgLower.includes('strategy_for_user_invalid')) {
    return 'طريقة تسجيل الدخول هذه غير صالحة لهذا الحساب (ربما قمت بالتسجيل عبر Google أو الدخول السريع).';
  }

  return message;
}

function isAlreadySignedInClerkError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;

  const clerkErr = err as { errors?: { message?: string; longMessage?: string; code?: string }[]; message?: string; status?: string };
  const messages = [
    clerkErr.message,
    clerkErr.status,
    ...(Array.isArray(clerkErr.errors)
      ? clerkErr.errors.flatMap((error) => [error.message, error.longMessage, error.code])
      : []),
  ];

  return messages.some((message) => {
    if (typeof message !== 'string') return false;
    const normalized = message.toLowerCase();
    return normalized.includes('already signed in') || normalized.includes('session_exists');
  });
}

/**
 * Sets a client-accessible cookie for SSR token forwarding.
 *
 * SECURITY DESIGN NOTE — Why access_token is NOT HttpOnly:
 * ─────────────────────────────────────────────────────────
 * The Go backend reads the `access_token` cookie during SSR requests from
 * Next.js server components (getAuthUser() in lib/auth/server.ts). Setting
 * HttpOnly would prevent the client from writing the cookie via document.cookie,
 * and Next.js server route handlers (not middleware) cannot set cookies on
 * the response in all cases.
 *
 * MITIGATIONS in place:
 *   1. Short TTL: cookie expires every 60s and is refreshed every 40s
 *   2. The REAL session is managed by Clerk's HttpOnly cookies — this cookie
 *      is only used as a Bearer token forwarder for API calls from Server Components
 *   3. CSP headers in middleware.ts block XSS vectors for inline scripts
 *   4. SameSite=Lax prevents CSRF attacks on this cookie
 *   5. Secure flag is set in production (HTTPS only)
 *
 * FUTURE: Migrate Server Component data fetching to use auth().getToken()
 * (getClerkToken in lib/auth/server.ts) instead of cookie forwarding.
 * That would allow removing this cookie entirely.
 */
function setClientCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof window === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function deleteClientCookie(name: string) {
  if (typeof window === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secure}`;
}


/**
 * Stores the original Clerk SignIn resource (the return value of
 * signIn.create()) so that verify2FA / resend2FA can reuse the exact same
 * SignIn object that was prepared during login().  Clerk may reset
 * client.signIn between re-renders; using a module-level variable preserves
 * the original signIn attempt and prevents "Incorrect code" errors.
 */
let pendingSignInRef: any = null;

export function AuthProvider({
  children,
  initialAuthHint,
}: { children: React.ReactNode; initialAuthHint?: boolean; }) {
  const { isLoaded: isClerkLoaded, userId, getToken } = useClerkAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useClerkUser();
  // Use stable selectors (not the whole store object) to avoid triggering
  // the sync useEffect on every unrelated store update.
  const setUser = useAuthStore((s) => s.setUser);
  const resetStore = useAuthStore((s) => s.reset);
  const setIsLoading = useAuthStore((s) => s.setIsLoading);

  const lastSyncedId = React.useRef<string | null>(null);
  const currentUserIdRef = React.useRef<string | null>(null);
  // Prevent concurrent syncProfile calls from overlapping state updates
  const isSyncing = React.useRef(false);
  // Store getToken in a ref so we can call it inside effects without
  // adding it to the dependency array (its reference changes every render,
  // which would re-trigger the sync effect and cause an infinite loop).
  const getTokenRef = React.useRef(getToken);
  React.useEffect(() => { getTokenRef.current = getToken; });

  // ── Stable snapshot of clerkUser fields ──────────────────────────────────
  // Clerk replaces the clerkUser object reference on every internal state
  // update (token refresh, polling, etc.) even when the actual user data has
  // NOT changed. Listing `clerkUser` directly in the dependency array therefore
  // re-triggers the sync effect on EVERY Clerk render, causing an infinite loop.
  // We instead depend on a stable string that only changes when the actual
  // data changes. This is the recommended pattern for Clerk hooks.
  const clerkUserStableKey = React.useMemo(() => {
    if (!clerkUser) return null;
    return JSON.stringify({
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      username: clerkUser.username,
      fullName: clerkUser.fullName,
      imageUrl: clerkUser.imageUrl,
      role: clerkUser.publicMetadata?.role,
      permissions: clerkUser.publicMetadata?.permissions,
      emailVerified: clerkUser.emailAddresses[0]?.verification?.status,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkUser?.id, clerkUser?.username, clerkUser?.fullName,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  (clerkUser?.publicMetadata?.role as string) ?? null]);
  // Keep a ref to the latest clerkUser so the async syncProfile can access it
  // without being listed as a dependency.
  const clerkUserRef = React.useRef(clerkUser);
  React.useEffect(() => { clerkUserRef.current = clerkUser; });

  // Sync ref with current userId to prevent race conditions during async calls
  useEffect(() => {
    currentUserIdRef.current = userId || null;
  }, [userId]);

  // Sync access_token cookie for SSR support
  useEffect(() => {
    if (!isClerkLoaded || !userId) {
      deleteClientCookie('access_token');
      return;
    }

    let active = true;
    let timerId: NodeJS.Timeout;

    const syncCookie = async () => {
      try {
        const token = await getTokenRef.current();
        if (!active) return;
        if (token) {
          // Set access_token cookie with a 60-second lifetime, matching the typical short lifetime of a Clerk token
          setClientCookie('access_token', token, 60);
        } else {
          deleteClientCookie('access_token');
        }
      } catch (err) {
        logger.error('Failed to sync access_token cookie:', err);
      } finally {
        if (active) {
          // Refresh the cookie every 40 seconds to keep it fresh
          timerId = setTimeout(syncCookie, 40000);
        }
      }
    };

    syncCookie();

    return () => {
      active = false;
      clearTimeout(timerId);
    };
  }, [isClerkLoaded, userId]);

  // Safety timeout: if Clerk or RPC fails to load/sync within the safety margin,
  // force isLoading to false so the application can render in fallback mode.
  // In development, we use a much longer timeout (45s) to allow for Next.js compilation overhead.
  // NOTE: We intentionally use getState() instead of listing setIsLoading in deps,
  // because Zustand selectors return a new function reference on every render which
  // would cause this effect to re-trigger infinitely, creating a reload loop.
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development' || 
      (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
    const timeoutMs = isDev ? 45000 : 8000;
    const timer = setTimeout(() => {
      const storeState = useAuthStore.getState();
      if (storeState.isLoading) {
        logger.warn(`Auth system failed to fully load/sync within ${timeoutMs / 1000} seconds. Forcing isLoading to false.`);
        storeState.setIsLoading(false);
      }
    }, timeoutMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map Clerk user to local AuthUser model and sync with Zustand store
  useEffect(() => {
    if (!isClerkLoaded) return;

    const activeClerkUser = clerkUser;

    if (!userId || (isUserLoaded && !activeClerkUser)) {
      lastSyncedId.current = null;
      resetStore(); // reset() already sets isLoading: false
      return;
    }

    let isCancelled = false;

    if (isUserLoaded && activeClerkUser) {
      // Get current store user without triggering effect dependency re-runs
      const currentStoreUser = useAuthStore.getState().user;

      // Pre-validation check for admin routes
      const role = activeClerkUser.publicMetadata?.role as string | undefined;
      const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

      // SECURITY: Only ADMIN_ROLES may access /admin — TEACHER is NOT an admin-tier role.
      // Using isAdminRole() from centralized types ensures this stays in sync with
      // middleware.ts and backend AdminRequired() middleware.
      if (isAdminRoute && role && !isAdminRole(role)) {
        logger.warn('[Security] Unauthorized admin route access attempt — role:', role);
        lastSyncedId.current = userId;
        resetStore(); // reset() already sets isLoading: false
        if (typeof window !== 'undefined') {
          window.location.href = '/unauthorized';
        }
        return;
      }

      const mappedUser: AuthUser = {
        id: activeClerkUser.id,
        email: activeClerkUser.emailAddresses[0]?.emailAddress || '',
        username: activeClerkUser.username || null,
        name: activeClerkUser.fullName || activeClerkUser.username || null,
        avatar: activeClerkUser.imageUrl || null,
        role: (role as 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPER_ADMIN' | 'MODERATOR' | 'PREMIUM') || 'STUDENT',
        emailVerified: activeClerkUser.emailAddresses[0]?.verification?.status === 'verified',
        permissions: Array.isArray(activeClerkUser.publicMetadata?.permissions)
          ? (activeClerkUser.publicMetadata.permissions as string[])
          : [],
      };

      // Set user immediately from Clerk to prevent loading UI hangs
      if (lastSyncedId.current !== userId || currentStoreUser?.id !== userId) {
        setUser(mappedUser);
      }

      // Avoid redundant profile syncs and state updates if already synced for the current userId
      if (lastSyncedId.current === userId && currentStoreUser?.id === userId) {
        setIsLoading(false); // Ensure store loading state is cleared
        return;
      }

      lastSyncedId.current = userId;

      const syncProfile = async () => {
        // Prevent overlapping concurrent calls (e.g., Clerk re-renders fast)
        if (isSyncing.current) return;
        isSyncing.current = true;
        try {
          // Use ref to avoid listing getToken in dependency array.
          // getToken reference changes on every Clerk render which would
          // cause this effect — and the resulting setState calls — to loop.
          const token = await getTokenRef.current();
          if (isCancelled || currentUserIdRef.current !== userId) return;

          const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
          const profile = await authRepository.getProfile(headers);
          if (isCancelled || currentUserIdRef.current !== userId) return;

          // Re-read from ref to get the freshest clerkUser without adding to deps
          const freshClerkUser = clerkUserRef.current;
          setUser({
            ...mappedUser,
            id: profile.id || mappedUser.id, // Trust database UUID as the primary identifier
            email: profile.email || mappedUser.email,
            role: (profile.role as 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPER_ADMIN' | 'MODERATOR' | 'PREMIUM') || 'STUDENT', // Trust server-side role
            permissions: Array.isArray(freshClerkUser?.publicMetadata?.permissions)
              ? (freshClerkUser.publicMetadata.permissions as string[])
              : [],
          });
        } catch (e) {
          if (isCancelled || currentUserIdRef.current !== userId) return;
          logger.error('Failed to load secure profile details via repository:', e);
          // Fallback user is already set, so we just log the error and ensure loading ends
        } finally {
          isSyncing.current = false;
          if (!isCancelled && currentUserIdRef.current === userId) {
            setIsLoading(false); // Mark loading complete in the shared store
          }
        }
      };

      syncProfile();
    }

    return () => {
      isCancelled = true;
    };
    // NOTE: `clerkUser` is intentionally replaced by `clerkUserStableKey` in deps.
    // Clerk replaces the clerkUser object reference on every internal state update
    // (token refresh, polling, etc.) even when data hasn't changed, which would
    // re-trigger this effect and cause an infinite loop. We use a stable key
    // computed from the actual fields that matter, and access clerkUser itself
    // via clerkUserRef inside the async body.
    // getToken + setIsLoading are also omitted — accessed via refs / stable Zustand setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkUserStableKey, isClerkLoaded, isUserLoaded, userId, setUser, resetStore]);

  return <>{children}</>;
}

export function useAuth() {
  const router = useRouter();
  const { isLoaded: isClerkLoaded, userId, getToken, signOut } = useClerkAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useClerkUser();
  // useClerk() returns a stable Clerk instance that exposes signIn, signUp, and
  // setActive(). Unlike useSignIn()/useSignUp(), it works from any component in
  // the tree — even from custom (non-Clerk-hosted) login/register pages.
  const clerk = useClerk();
  const getClerkInstance = useCallback(() => {
    const active = clerk || (typeof window !== 'undefined' ? (window as unknown as { Clerk?: typeof clerk }).Clerk : null);
    return active && active.client ? active : null;
  }, [clerk]);
  const isClerkInstanceReady = !!getClerkInstance();

  /**
   * Poll until clerk.client is available (max ~3 s) so that pressing the login
   * button before Clerk fully initialises doesn't immediately surface the
   * "Auth system not fully loaded" error.
   */
  const waitForClerkClient = useCallback((): Promise<ReturnType<typeof getClerkInstance>> => {
    return new Promise((resolve) => {
      const instance = getClerkInstance();
      if (instance) { resolve(instance); return; }
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const inst = getClerkInstance();
        if (inst) { clearInterval(interval); resolve(inst); return; }
        if (attempts >= 30) { clearInterval(interval); resolve(null); }
      }, 100); // check every 100 ms, up to 3 s
    });
  }, [getClerkInstance]);

  const user = useAuthStore((state) => state.user);
  const isStoreLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const resetStore = useAuthStore((state) => state.reset);
  const setUser = useAuthStore((state) => state.setUser);

  // Use Zustand store's loading state as the single source of truth.
  // This prevents infinite hangs if Clerk fails to load.
  const isLoading = isStoreLoading;

  const fetchWithAuth = useCallback(async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const [input, init] = args;
    const token = await getToken();
    const headers = new Headers(init?.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(input, {
      ...init,
      headers,
    });
  }, [getToken]);

  /** Sign out every active Clerk session, then wait briefly so Clerk propagates the state. */
  const forceSignOutAll = useCallback(async (activeClerk: ReturnType<typeof getClerkInstance>) => {
    if (!activeClerk) return;
    try {
      const sessions = activeClerk.client?.sessions ?? [];
      if (sessions.length > 0) {
        // Sign out each session individually for reliability
        await Promise.all(
          sessions.map((s: { id: string }) => activeClerk.signOut({ sessionId: s.id }).catch(() => { }))
        );
      } else if (activeClerk.session) {
        await activeClerk.signOut();
      }
      // Small delay to let Clerk propagate the sign-out across its internal state
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (e) {
      logger.warn('forceSignOutAll error (non-fatal):', e);
    }
  }, [getClerkInstance]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string, rememberMe?: boolean): Promise<{ success: boolean; requires2FA?: boolean; userId?: string; error?: string; }> => {
    const activeClerk = await waitForClerkClient();
    if (!activeClerk?.client) return { success: false, error: 'Auth system not fully loaded' };
    
    // Helper to attempt sign-in without force-signing-out first.
    // Signing out before every login race-conditions the Clerk client state
    // (client.signIn may be reset or in transition) causing signIn.create()
    // to fail with an unexpected error that falls through to the generic
    // Arabic fallback message.
    const attemptSignIn = async (clk: NonNullable<ReturnType<typeof getClerkInstance>>) => {
      if (clk.session) {
        // There is an active Clerk session; requesting signIn.create while
        // a session is alive triggers a "Bad Request" from Clerk because it
        // considers the user already authenticated.
        // Throw a special signal so the outer catch signs out first and retries.
        // NOTE: The message must contain "signIn" to be detected by the catch
        // block below that checks `firstErr.message.includes('signIn')`.
        throw new Error('Session already active - signIn unavailable - signing out');
      }
      if (!clk.client.signIn) {
        // If signIn is not available, we need to sign out first.
        // Throw a special signal for the outer catch to handle.
        throw new Error('No signIn available - session exists');
      }
      return clk.client.signIn.create({
        identifier: email,
        password,
      });
    };

    try {
      let result;
      try {
        result = await attemptSignIn(activeClerk);
      } catch (firstErr: unknown) {
        // Determine if we need to sign out first before retrying.
        // This can happen in two scenarios:
        //   1. attemptSignIn threw because client.signIn was undefined (a session already exists).
        //   2. Clerk's signIn.create() rejected with a session-related error (e.g. "already signed in").
        let needsSignOut = false;
        if (firstErr instanceof Error && firstErr.message.includes('signIn')) {
          // Our own throw from attemptSignIn when signIn is unavailable
          needsSignOut = true;
        } else if (firstErr && typeof firstErr === 'object') {
          const clerkMsg = ((firstErr as { errors?: { message?: string }[] }).errors?.[0]?.message || '').toLowerCase();
          if (clerkMsg.includes('already') || clerkMsg.includes('sign')) {
            needsSignOut = true;
          }
        }

        if (needsSignOut) {
          await forceSignOutAll(activeClerk);
          // After sign-out, Clerk resets the client internally. Re-fetch a fresh
          // Clerk instance so client.signIn is available again.
          const freshClerk = getClerkInstance();
          if (!freshClerk?.client?.signIn) {
            return { success: false, error: 'Auth system not fully loaded' };
          }
          result = await freshClerk.client.signIn.create({
            identifier: email,
            password,
          });
        } else {
          // Rethrow non-session errors to be caught by the outer handler
          throw firstErr;
        }
      }

      if (result.status === 'complete') {
        const clerkToActivate = getClerkInstance() || activeClerk;
        await clerkToActivate.setActive({ session: result.createdSessionId });
        return { success: true };
      }
      if (result.status === 'needs_second_factor') {
        // Pick the best available second factor strategy
        const strategyPriority = ['totp', 'email_code', 'phone_code', 'backup_code'];
        const factor = strategyPriority.reduce<{ strategy: string } | undefined>((found, s) => {
          if (found) return found;
          return result.supportedSecondFactors?.find(
            (f: unknown) => (f as { strategy: string }).strategy === s
          ) as { strategy: string } | undefined;
        }, undefined);
        const strategy = ((factor as { strategy: string } | undefined)?.strategy || 'totp') as 'phone_code' | 'email_code' | 'totp' | 'backup_code';

        // Clerk requires preparing/sending the second factor code for email_code and phone_code before attempting to verify.
        if (strategy === 'email_code' || strategy === 'phone_code') {
          try {
            await result.prepareSecondFactor({ strategy });
          } catch (prepareErr: any) {
            logger.warn('Failed to prepare second factor during login:', prepareErr);
          }
        }
        // Store the pending signIn reference so verify2FA/resend2FA can reuse the exact
        // same SignIn resource that was prepared here, even if Clerk resets client.signIn
        // between re-renders. This prevents "Incorrect code" errors from stale references.
        pendingSignInRef = result;
        return { success: true, requires2FA: true, userId: result.id };
      }
      return { success: false, error: `Additional steps required: ${result.status}` };
    } catch (err: unknown) {
      logger.error('Login error:', err);
      return { success: false, error: getClerkErrorMessage(err, 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.') };
    }
  }, [waitForClerkClient, forceSignOutAll]);

  const adminLogin = useCallback(async (email: string, password: string, rememberMe?: boolean): Promise<{ success: boolean; requires2FA?: boolean; userId?: string; error?: string; }> => {
    const activeClerk = getClerkInstance();
    if (!activeClerk?.client) return { success: false, error: 'Auth system not fully loaded' };
    try {
      await forceSignOutAll(activeClerk);

      // Re-fetch a fresh Clerk instance after sign-out to avoid using stale
      // reference where client.signIn may have been reset.
      const freshClerk = getClerkInstance();
      if (!freshClerk?.client?.signIn) return { success: false, error: 'Auth system not fully loaded' };

      const result = await freshClerk.client.signIn.create({
        identifier: email,
        password,
      });
      if (result.status === 'complete') {
        // Use the fresh Clerk instance (not the stale activeClerk) because
        // forceSignOutAll reset the internal client state.
        await freshClerk.setActive({ session: result.createdSessionId });

        // SECURITY: Only ADMIN, SUPER_ADMIN, and MODERATOR may access the admin panel.
        // TEACHER is a content-creator role, NOT an administrative role.
        // This check MUST match: middleware.ts isAdminRole(), backend AdminOrModerator().
        const role = freshClerk.user?.publicMetadata?.role as string | undefined;
        const adminRoles = new Set(['ADMIN', 'SUPER_ADMIN', 'MODERATOR']);
        if (!role || !adminRoles.has(role.toUpperCase())) {
          await freshClerk.signOut();
          return { success: false, error: 'غير مصرح لك بالدخول كمسؤول' };
        }
        return { success: true };
      }
      if (result.status === 'needs_second_factor') {
        // Pick the best available second factor strategy
        const strategyPriority = ['totp', 'email_code', 'phone_code', 'backup_code'];
        const factor = strategyPriority.reduce<{ strategy: string } | undefined>((found, s) => {
          if (found) return found;
          return result.supportedSecondFactors?.find(
            (f: unknown) => (f as { strategy: string }).strategy === s
          ) as { strategy: string } | undefined;
        }, undefined);
        const strategy = ((factor as { strategy: string } | undefined)?.strategy || 'totp') as 'phone_code' | 'email_code' | 'totp' | 'backup_code';

        // Clerk requires preparing/sending the second factor code for email_code and phone_code before attempting to verify.
        if (strategy === 'email_code' || strategy === 'phone_code') {
          try {
            await result.prepareSecondFactor({ strategy });
          } catch (prepareErr: any) {
            logger.warn('Failed to prepare second factor during admin login:', prepareErr);
          }
        }
        pendingSignInRef = result;
        return { success: true, requires2FA: true, userId: result.id };
      }
      return { success: false, error: `الخطوات الإضافية مطلوبة: ${result.status}` };
    } catch (err: unknown) {
      logger.error('Admin login error:', err);
      return { success: false, error: getClerkErrorMessage(err, 'فشل تسجيل الدخول') };
    }
  }, [getClerkInstance, forceSignOutAll]);

  const register = useCallback(async (
    data: {
      email: string;
      password: string;
      username?: string;
      role?: string;
      phone?: string;
      country?: string;
      dateOfBirth?: string;
      gradeLevel?: string;
      educationType?: string;
      interestedSubjects?: string[];
    }
  ): Promise<{ success: boolean; error?: string; message?: string; autoLoggedIn?: boolean; }> => {
    const activeClerk = getClerkInstance();
    if (!activeClerk?.client) return { success: false, error: 'Auth system not fully loaded' };
    try {
      await forceSignOutAll(activeClerk);

      // Re-fetch a fresh Clerk instance after sign-out to avoid using stale
      // reference where client.signUp may have been reset.
      const freshClerk = getClerkInstance();
      if (!freshClerk?.client?.signUp) return { success: false, error: 'Auth system not fully loaded' };

      const result = await freshClerk.client.signUp.create({
        emailAddress: data.email,
        password: data.password,
        username: data.username,
        unsafeMetadata: {
          role: data.role || 'STUDENT',
          phone: data.phone || '',
          country: data.country || '',
          dateOfBirth: data.dateOfBirth || '',
          gradeLevel: data.gradeLevel || '',
          educationType: data.educationType || '',
          interestedSubjects: data.interestedSubjects || [],
        }
      });
      if (result.status === 'complete') {
        await freshClerk.setActive({ session: result.createdSessionId });
        return { success: true, autoLoggedIn: true };
      }
      // Email verification required — trigger OTP send automatically
      if (result.status === 'missing_requirements' || result.unverifiedFields?.includes('email_address')) {
        try {
          await freshClerk.client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        } catch (prepareErr) {
          logger.error('Failed to prepare email verification:', prepareErr);
        }
      }
      return { success: true, autoLoggedIn: false };
    } catch (err: unknown) {
      logger.error('Registration error:', err);
      return { success: false, error: getClerkErrorMessage(err, 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.') };
    }
  }, [getClerkInstance, forceSignOutAll]);

  const logout = useCallback(async (allDevices?: boolean) => {
    await signOut();
    resetStore();
    router.replace('/login');
  }, [signOut, resetStore, router]);

  const verify2FA = useCallback(async (signInId: string, token: string, rememberMe?: boolean): Promise<{ success: boolean; error?: string; }> => {
    const activeClerk = getClerkInstance();
    if (!activeClerk?.client) return { success: false, error: 'Auth system not fully loaded' };
    try {
      // If the user is already signed in, Clerk's attemptSecondFactor() will
      // reject with "You're already signed in". This can happen when Clerk
      // internally resolves the session between the 2FA prompt and submission
      // (e.g. via a stored session, a 1FA-only strategy that completed silently,
      // or because the first factor was already sufficient for this user).
      // In this case, treat the 2FA as already complete and redirect normally.
      if (activeClerk.session || (activeClerk.client.sessions?.length ?? 0) > 0) {
        pendingSignInRef = null;
        return { success: true };
      }

      // Use the stored signIn reference if available; fall back to client.signIn.
      // The stored reference is the exact SignIn resource returned by
      // signIn.create() in login(), preserving the prepared 2FA state.
      // Clerk may reset client.signIn between re-renders, causing
      // attemptSecondFactor() to fail with "Incorrect code". By using the
      // original reference we avoid this issue entirely.
      const signIn = pendingSignInRef || activeClerk.client.signIn;
      if (!signIn) {
        return { success: false, error: 'Auth system not fully loaded' };
      }
      if (signIn.status === 'complete' && signIn.createdSessionId) {
        pendingSignInRef = null;
        await activeClerk.setActive({ session: signIn.createdSessionId });
        return { success: true };
      }
      // signInId is the SignIn resource .id (from signIn.create result),
      // not the Clerk userId. We compare against signIn.id from the active session.
      if (signInId && signIn.id && signIn.id !== signInId) {
        return { success: false, error: 'محاولة تسجيل دخول غير صالحة أو منتهية الصلاحية' };
      }
      // Pick the best available second factor strategy
      const strategyPriority = ['totp', 'email_code', 'phone_code', 'backup_code'];
      const factor = strategyPriority.reduce<{ strategy: string } | undefined>((found, s) => {
        if (found) return found;
          return signIn.supportedSecondFactors?.find(
            (f: unknown) => (f as { strategy: string }).strategy === s
          ) as { strategy: string } | undefined;
        }, undefined);
        const strategy = ((factor as { strategy: string } | undefined)?.strategy || 'totp') as 'phone_code' | 'email_code' | 'totp' | 'backup_code';
      
      // Code is prepared/sent upon initial login detection.

      const result = await signIn.attemptSecondFactor({
        strategy,
        code: token,
      });
      // Clear the stored reference on success so it can't be reused accidentally.
      if (result.status === 'complete') {
        pendingSignInRef = null;
        await activeClerk.setActive({ session: result.createdSessionId });
        return { success: true };
      }
      return { success: false, error: `خطوة إضافية مطلوبة: ${result.status}` };
    } catch (err: unknown) {
      if (isAlreadySignedInClerkError(err)) {
        pendingSignInRef = null;
        return { success: true };
      }

      logger.error('2FA verification error:', err);
      return { success: false, error: getClerkErrorMessage(err, 'رمز التحقق غير صحيح') };
    }
  }, [getClerkInstance]);

  const resend2FA = useCallback(async (signInId: string): Promise<{ success: boolean; error?: string; }> => {
    const activeClerk = getClerkInstance();
    if (!activeClerk?.client) return { success: false, error: 'Auth system not fully loaded' };
    try {
      // Use the stored signIn reference (same rationale as verify2FA above).
      const signIn = pendingSignInRef || activeClerk.client.signIn;
      if (!signIn) {
        return { success: false, error: 'Auth system not fully loaded' };
      }
      if (signInId && signIn.id && signIn.id !== signInId) {
        return { success: false, error: 'محاولة تسجيل دخول غير صالحة أو منتهية الصلاحية' };
      }
      const strategyPriority = ['totp', 'email_code', 'phone_code', 'backup_code'];
      const factor = strategyPriority.reduce<{ strategy: string } | undefined>((found, s) => {
        if (found) return found;
          return signIn.supportedSecondFactors?.find(
            (f: unknown) => (f as { strategy: string }).strategy === s
          ) as { strategy: string } | undefined;
        }, undefined);
        const strategy = ((factor as { strategy: string } | undefined)?.strategy || 'totp') as 'phone_code' | 'email_code' | 'totp' | 'backup_code';

        if (strategy === 'email_code' || strategy === 'phone_code') {
          await signIn.prepareSecondFactor({ strategy });
        return { success: true };
      }
      return { success: false, error: 'طريقة التحقق الثنائي هذه لا تتطلب إرسال رمز' };
    } catch (err: unknown) {
      logger.error('2FA resend error:', err);
      return { success: false, error: getClerkErrorMessage(err, 'فشل إعادة إرسال الرمز') };
    }
  }, [getClerkInstance]);

  const refreshUser = useCallback(async (options?: { clearOnFailure?: boolean; }) => {
    if (!userId || !clerkUser) {
      if (options?.clearOnFailure) {
        resetStore();
      }
      return false;
    }
    try {
      await clerkUser.reload();
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const profile = await authRepository.getProfile(headers);

      const mappedUser: AuthUser = {
        id: profile.id || clerkUser.id, // Trust database UUID as the primary identifier
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        username: clerkUser.username || null,
        name: clerkUser.fullName || clerkUser.username || null,
        avatar: clerkUser.imageUrl || null,
        role: (profile.role as 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPER_ADMIN' | 'MODERATOR' | 'PREMIUM') || 'STUDENT',
        emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
        permissions: Array.isArray(clerkUser.publicMetadata?.permissions)
          ? (clerkUser.publicMetadata.permissions as string[])
          : [],
      };

      setUser(mappedUser);
      return true;
    } catch (e) {
      logger.error('Failed to refresh user profile:', e);
      if (options?.clearOnFailure) {
        resetStore();
      }
      return false;
    }
  }, [userId, clerkUser, getToken, setUser, resetStore]);

  const forgotPassword = useCallback(async (email: string): Promise<{ success: boolean; error?: string; message?: string; }> => {
    const activeClerk = getClerkInstance();
    if (!activeClerk?.client) return { success: false, error: 'Auth system not fully loaded' };
    try {
      const result = await activeClerk.client.signIn.create({
        identifier: email,
      });
      const firstFactor = result.supportedFirstFactors?.find(
        (f) => (f as { strategy: string }).strategy === 'reset_password_email_code'
      ) as { strategy: string; emailAddressId?: string } | undefined;

      if (firstFactor && firstFactor.emailAddressId) {
        await activeClerk.client.signIn.prepareFirstFactor({
          strategy: 'reset_password_email_code',
          emailAddressId: firstFactor.emailAddressId,
        });
        return { success: true, message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.' };
      }
      return { success: false, error: 'طريقة استعادة كلمة المرور غير مدعومة لهذا الحساب' };
    } catch (err: unknown) {
      logger.error('Forgot password error:', err);
      return { success: false, error: getClerkErrorMessage(err, 'فشل إرسال رمز التحقق') };
    }
  }, [getClerkInstance]);

  const resetPassword = useCallback(async (tokenOrPassword: string, newPassword?: string, code?: string, email?: string): Promise<{ success: boolean; error?: string; }> => {
    const activeClerk = getClerkInstance();
    if (!activeClerk?.client) return { success: false, error: 'Auth system not fully loaded' };
    try {
      if (!code) {
        return { success: false, error: 'رمز التحقق مطلوب' };
      }

      if (!activeClerk.client) return { success: false, error: 'Auth system not fully loaded' };
      let signIn = activeClerk.client.signIn;
      if (!signIn || !signIn.identifier || (email && signIn.identifier !== email)) {
        if (!email) {
          return { success: false, error: 'الجلسة انتهت. يرجى طلب رمز جديد.' };
        }
        signIn = await activeClerk.client.signIn.create({
          identifier: email,
        });
      }

      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password: tokenOrPassword,
      });

      if (result.status === 'complete') {
        await activeClerk.setActive({ session: result.createdSessionId });
        return { success: true };
      }
      return { success: false, error: `خطوة إضافية مطلوبة: ${result.status}` };
    } catch (err: unknown) {
      logger.error('Reset password error:', err);
      return { success: false, error: getClerkErrorMessage(err, 'فشل إعادة تعيين كلمة المرور') };
    }
  }, [getClerkInstance]);

  const verifyEmail = useCallback(async (token: string): Promise<{ success: boolean; error?: string }> => {
    // Email verification is handled via Clerk OTP during registration (see OTPVerificationStep).
    return { success: true };
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    // Resend is handled via Clerk's prepareEmailAddressVerification in OTPVerificationStep.
    return { success: true };
  }, []);

  /**
   * Sign in with an OAuth provider (Google, GitHub, Apple, etc.).
   * Redirects the user to the provider's auth page, then back to /sso-callback.
   * Clerk handles the callback and session creation automatically.
   */
  const signInWithOAuth = useCallback(async (
    provider: 'oauth_google' | 'oauth_github' | 'oauth_apple' | 'oauth_microsoft',
    redirectUrl?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const activeClerk = getClerkInstance();
    if (!activeClerk?.client) return { success: false, error: 'Auth system not fully loaded' };
    try {
      await forceSignOutAll(activeClerk);
      const freshClerk = getClerkInstance();
      if (!freshClerk?.client?.signIn) return { success: false, error: 'Auth system not fully loaded' };

      // authenticateWithRedirect triggers the OAuth flow.
      // The user will be redirected back to redirectUrl after authentication.
      await freshClerk.client.signIn.authenticateWithRedirect({
        strategy: provider,
        redirectUrl: redirectUrl ?? `${window.location.origin}/sso-callback`,
        redirectUrlComplete: redirectUrl ?? `${window.location.origin}/dashboard`,
      });
      return { success: true };
    } catch (err: unknown) {
      logger.error('OAuth sign-in error:', err);
      return { success: false, error: getClerkErrorMessage(err, 'فشل تسجيل الدخول عبر الخدمة الخارجية') };
    }
  }, [getClerkInstance, forceSignOutAll]);

  /**
   * Update the current user's password via Clerk.
   * Requires the user to provide their current password for verification.
   */
  const updatePassword = useCallback(async (
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!clerkUser) return { success: false, error: 'المستخدم غير مسجل الدخول' };
    try {
      await clerkUser.updatePassword({ currentPassword, newPassword });
      return { success: true };
    } catch (err: unknown) {
      logger.error('Update password error:', err);
      return { success: false, error: getClerkErrorMessage(err, 'فشل تحديث كلمة المرور') };
    }
  }, [clerkUser]);

  /**
   * Initiate an email address change via Clerk.
   * Clerk will send a verification code to the new email.
   */
  const initiateEmailChange = useCallback(async (
    newEmail: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!clerkUser) return { success: false, error: 'المستخدم غير مسجل الدخول' };
    try {
      const emailAddress = await clerkUser.createEmailAddress({ email: newEmail });
      await emailAddress.prepareVerification({ strategy: 'email_code' });
      return { success: true };
    } catch (err: unknown) {
      logger.error('Initiate email change error:', err);
      return { success: false, error: getClerkErrorMessage(err, 'فشل إرسال رمز التحقق للبريد الجديد') };
    }
  }, [clerkUser]);

  const requestMagicLink = useCallback(async (email: string): Promise<{ success: boolean; error?: string; }> => {
    const activeClerk = getClerkInstance();
    if (!activeClerk?.client) return { success: false, error: 'Auth system not fully loaded' };
    try {
      const result = await activeClerk.client.signIn.create({
        identifier: email,
      });
      const firstFactor = result.supportedFirstFactors?.find(
        (f) => (f as { strategy: string }).strategy === 'email_code'
      ) as { strategy: string; emailAddressId?: string } | undefined;
      if (firstFactor && firstFactor.emailAddressId) {
        await activeClerk.client.signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: firstFactor.emailAddressId,
        });
        return { success: true };
      }
      return { success: false, error: 'طريقة الدخول السريع غير مدعومة لهذا الحساب' };
    } catch (err: unknown) {
      logger.error('Magic link request error:', err);
      return { success: false, error: getClerkErrorMessage(err, 'فشل إرسال كود الدخول السريع') };
    }
  }, [getClerkInstance]);

  const verifyOTP = useCallback(async (code: string): Promise<{ success: boolean; error?: string; }> => {
    const activeClerk = getClerkInstance();
    if (!activeClerk?.client) return { success: false, error: 'Auth system not fully loaded' };
    try {
      const result = await activeClerk.client.signIn.attemptFirstFactor({
        strategy: 'email_code',
        code,
      });
      if (result.status === 'complete') {
        await activeClerk.setActive({ session: result.createdSessionId });
        return { success: true };
      }
      return { success: false, error: `خطوة إضافية مطلوبة: ${result.status}` };
    } catch (err: unknown) {
      logger.error('OTP verification error:', err);
      return { success: false, error: getClerkErrorMessage(err, 'رمز التحقق غير صحيح') };
    }
  }, [getClerkInstance]);

  return {
    user,
    isLoading,
    isAuthenticated,
    isInitialLoad: isLoading,
    login,
    adminLogin,
    register,
    logout,
    verify2FA,
    resend2FA,
    refreshUser,
    fetchWithAuth,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    requestMagicLink,
    verifyOTP,
    signInWithOAuth,
    updatePassword,
    initiateEmailChange,
  };
}
