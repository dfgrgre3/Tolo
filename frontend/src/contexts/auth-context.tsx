'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useClerkAuth, useUser as useClerkUser, useClerk } from '@clerk/nextjs';
import { useAuthStore, type AuthUser } from '@/lib/auth/auth-store';
import { logger } from '@/lib/logger';
import { authApiService } from '@/services/auth/auth-api-service';
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

  return message;
}

export function AuthProvider({
  children,
  initialAuthHint,
}: {children: React.ReactNode; initialAuthHint?: boolean;}) {
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

  // Safety timeout: if Clerk fails to load (e.g. CSP/network/adblock issues),
  // force isLoading to false so the application can render in unauthenticated fallback mode.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isClerkLoaded || !isUserLoaded) {
        logger.warn('Clerk failed to load within 5 seconds. Falling back to unauthenticated state.');
        resetStore();
      }
    }, 8000); // Increased from 5s to 8s — Clerk can be slow on first load
    return () => clearTimeout(timer);
  }, [isClerkLoaded, isUserLoaded, resetStore]);

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

      if (isAdminRoute && role && role !== 'ADMIN' && role !== 'TEACHER' && role !== 'SUPER_ADMIN' && role !== 'MODERATOR') {
        logger.warn('Unauthorized admin route access attempt by role:', role);
        lastSyncedId.current = userId;
        resetStore(); // reset() already sets isLoading: false
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
          sessions.map((s: { id: string }) => activeClerk.signOut({ sessionId: s.id }).catch(() => {}))
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

  const login = useCallback(async (email: string, password: string, rememberMe?: boolean): Promise<{success: boolean; requires2FA?: boolean; userId?: string; error?: string;}> => {
    const activeClerk = getClerkInstance();
    if (!activeClerk?.client) return { success: false, error: 'Auth system not fully loaded' };
    try {
      // Always clear any existing sessions before attempting a new sign-in.
      // This is the key fix: switching accounts requires all old sessions to be
      // fully cleared from Clerk's client state before signIn.create() is called.
      await forceSignOutAll(activeClerk);

      // After forceSignOut, Clerk resets the client internally (client.signIn may
      // become undefined on the old reference). Re-fetch a fresh Clerk instance
      // so client.signIn is available again.
      const freshClerk = getClerkInstance();
      if (!freshClerk?.client?.signIn) return { success: false, error: 'Auth system not fully loaded' };

      const result = await freshClerk.client.signIn.create({
        identifier: email,
        password,
        strategy: 'password',
      });
      if (result.status === 'complete') {
        // Use the fresh Clerk instance (not the stale activeClerk) because
        // forceSignOutAll reset the internal client state.
        await freshClerk.setActive({ session: result.createdSessionId });
        return { success: true };
      }
      if (result.status === 'needs_second_factor') {
        return { success: true, requires2FA: true, userId: result.id };
      }
      return { success: false, error: `Additional steps required: ${result.status}` };
    } catch (err: unknown) {
      logger.error('Login error:', err);
      return { success: false, error: getClerkErrorMessage(err, 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.') };
    }
  }, [getClerkInstance, forceSignOutAll]);

  const adminLogin = useCallback(async (email: string, password: string, rememberMe?: boolean): Promise<{success: boolean; requires2FA?: boolean; userId?: string; error?: string;}> => {
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
        strategy: 'password',
      });
      if (result.status === 'complete') {
        // Use the fresh Clerk instance (not the stale activeClerk) because
        // forceSignOutAll reset the internal client state.
        await freshClerk.setActive({ session: result.createdSessionId });
        
        // Check role immediately after setting active
        const role = freshClerk.user?.publicMetadata?.role;
        if (role !== 'ADMIN' && role !== 'TEACHER' && role !== 'SUPER_ADMIN' && role !== 'MODERATOR') {
          await freshClerk.signOut();
          return { success: false, error: 'غير مصرح لك بالدخول كمسؤول' };
        }
        return { success: true };
      }
      if (result.status === 'needs_second_factor') {
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
  ): Promise<{success: boolean; error?: string; message?: string; autoLoggedIn?: boolean;}> => {
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

  const verify2FA = useCallback(async (signInId: string, token: string, rememberMe?: boolean): Promise<{success: boolean; error?: string;}> => {
    const activeClerk = getClerkInstance();
    if (!activeClerk?.client) return { success: false, error: 'Auth system not fully loaded' };
    try {
      const signIn = activeClerk.client.signIn;
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
          (f) => (f as { strategy: string }).strategy === s
        ) as { strategy: string } | undefined;
      }, undefined);
      const strategy = ((factor as { strategy: string } | undefined)?.strategy || 'totp') as 'phone_code' | 'email_code' | 'totp' | 'backup_code';
      const result = await signIn.attemptSecondFactor({
        strategy,
        code: token,
      });
      if (result.status === 'complete') {
        await activeClerk.setActive({ session: result.createdSessionId });
        return { success: true };
      }
      return { success: false, error: `خطوة إضافية مطلوبة: ${result.status}` };
    } catch (err: unknown) {
      logger.error('2FA verification error:', err);
      return { success: false, error: getClerkErrorMessage(err, 'رمز التحقق غير صحيح') };
    }
  }, [getClerkInstance]);

  const refreshUser = useCallback(async (options?: {clearOnFailure?: boolean;}) => {
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
        id: clerkUser.id,
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

  const forgotPassword = useCallback(async (email: string): Promise<{success: boolean; error?: string; message?: string;}> => {
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

  const resetPassword = useCallback(async (tokenOrPassword: string, newPassword?: string, code?: string, email?: string): Promise<{success: boolean; error?: string;}> => {
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

  const requestMagicLink = useCallback(async (email: string): Promise<{success: boolean; error?: string;}> => {
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

  const verifyOTP = useCallback(async (code: string): Promise<{success: boolean; error?: string;}> => {
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


