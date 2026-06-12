'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useClerkAuth, useUser as useClerkUser, useClerk } from '@clerk/nextjs';
import { useAuthStore, type AuthUser } from '@/lib/auth/auth-store';
import { logger } from '@/lib/logger';

export function AuthProvider({
  children,
  initialAuthHint,
}: {children: React.ReactNode; initialAuthHint?: boolean;}) {
  const { isLoaded: isClerkLoaded, userId, getToken } = useClerkAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useClerkUser();
  const { user: storeUser, setUser, reset: resetStore } = useAuthStore();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const lastSyncedId = React.useRef<string | null>(null);

  // Map Clerk user to local AuthUser model and sync with Zustand store
  useEffect(() => {
    if (!isClerkLoaded) return;

    if (!userId) {
      if (lastSyncedId.current !== null) {
        lastSyncedId.current = null;
        resetStore();
      }
      setIsInitialLoad(false);
      return;
    }

    if (isUserLoaded && clerkUser) {
      // Avoid redundant profile syncs and state updates if already synced for the current userId
      if (lastSyncedId.current === userId && storeUser?.id === userId) {
        setIsInitialLoad(false);
        return;
      }

      lastSyncedId.current = userId;

      // Asynchronously load detailed secure profile data from repository layer
      import('@/data-access/repositories/auth-repository').then(async ({ authRepository }) => {
        const mappedUser: AuthUser = {
          id: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          username: clerkUser.username || null,
          name: clerkUser.fullName || clerkUser.username || null,
          avatar: clerkUser.imageUrl || null,
          role: 'STUDENT', // Default to safe role
          emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
          permissions: [], // Default to no permissions
        };

        try {
          const token = await getToken();
          const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
          const profile = await authRepository.getProfile(headers);
          setUser({
            ...mappedUser,
            email: profile.email || mappedUser.email,
            role: profile.role || 'STUDENT', // Trust server-side role
            permissions: (clerkUser.publicMetadata?.permissions as string[]) || [],
          });
        } catch (e) {
          logger.error('Failed to load secure profile details via repository:', e);
          // Safe fallback to STUDENT role with no permissions on server failure (prevents privilege escalation)
          setUser({
            ...mappedUser,
            role: 'STUDENT',
            permissions: [],
          });
        } finally {
          setIsInitialLoad(false);
        }
      });
    }
  }, [clerkUser, isClerkLoaded, isUserLoaded, userId, setUser, resetStore, storeUser?.id]);

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
    if (clerk) return clerk;
    if (typeof window !== 'undefined') {
      return (window as any).Clerk;
    }
    return null;
  }, [clerk]);
  const isClerkInstanceReady = !!getClerkInstance();

  const user = useAuthStore((state) => state.user);
  const isStoreLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const resetStore = useAuthStore((state) => state.reset);

  // Auth-system is "fully loaded" when Clerk core + the user object have reported
  // `isLoaded: true`. signIn/signUp/setActive from useClerk() are always available
  // (they're not gated on a <SignIn/> / <SignUp/> context like useSignIn/useSignUp
  // are), so we no longer need to wait for those to "load" before allowing login.
  const authSystemReady = isClerkLoaded && (!userId || isUserLoaded);
  // Backwards-compatible `isLoading` flag for the existing UI: true until we know
  // for sure whether the user is signed in.
  const isLoading = !authSystemReady || isStoreLoading;

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

  const login = useCallback(async (email: string, password: string, rememberMe?: boolean): Promise<{success: boolean; requires2FA?: boolean; userId?: string; error?: string;}> => {
    const activeClerk = getClerkInstance();
    if (!activeClerk) return { success: false, error: 'Auth system not fully loaded' };
    try {
      const result = await activeClerk.client.signIn.create({
        identifier: email,
        password,
        strategy: 'password',
      });
      if (result.status === 'complete') {
        await activeClerk.setActive({ session: result.createdSessionId });
        return { success: true };
      }
      if (result.status === 'needs_second_factor') {
        return { success: true, requires2FA: true, userId: result.id };
      }
      return { success: false, error: `Additional steps required: ${result.status}` };
    } catch (err: any) {
      logger.error('Login error:', err);
      return { success: false, error: err.errors?.[0]?.message || 'Login failed' };
    }
  }, [getClerkInstance]);

  const adminLogin = useCallback(async (email: string, password: string, rememberMe?: boolean): Promise<{success: boolean; requires2FA?: boolean; userId?: string; error?: string;}> => {
    return login(email, password, rememberMe);
  }, [login]);

  const register = useCallback(async (
    data: {
      email: string;
      password: string;
      username?: string;
      role?: string;
    }
  ): Promise<{success: boolean; error?: string; message?: string; autoLoggedIn?: boolean;}> => {
    const activeClerk = getClerkInstance();
    if (!activeClerk) return { success: false, error: 'Auth system not fully loaded' };
    try {
      const result = await activeClerk.client.signUp.create({
        emailAddress: data.email,
        password: data.password,
        username: data.username,
      });
      if (result.status === 'complete') {
        await activeClerk.setActive({ session: result.createdSessionId });
        return { success: true, autoLoggedIn: true };
      }
      // Email verification required — trigger OTP send automatically
      if (result.status === 'missing_requirements' || result.unverifiedFields?.includes('email_address')) {
        try {
          await activeClerk.client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        } catch (prepareErr) {
          logger.error('Failed to prepare email verification:', prepareErr);
        }
      }
      return { success: true, autoLoggedIn: false };
    } catch (err: any) {
      logger.error('Registration error:', err);
      return { success: false, error: err.errors?.[0]?.message || 'Registration failed' };
    }
  }, [getClerkInstance]);


  const logout = useCallback(async (allDevices?: boolean) => {
    await signOut();
    resetStore();
    router.replace('/login');
  }, [signOut, resetStore, router]);

  const verify2FA = useCallback(async (userId: string, token: string, rememberMe?: boolean): Promise<{success: boolean; error?: string;}> => {
    const activeClerk = getClerkInstance();
    if (!activeClerk) return { success: false, error: 'Auth system not fully loaded' };
    try {
      const signIn = activeClerk.client.signIn;
      const factor = signIn.supportedSecondFactors?.find(
          (f: any) => f.strategy === 'totp' || f.strategy === 'phone_code' || f.strategy === 'email_code' || f.strategy === 'backup_code'
      );
      const strategy = (factor?.strategy || 'totp') as 'phone_code' | 'email_code' | 'totp' | 'backup_code';
      const result = await signIn.attemptSecondFactor({
        strategy,
        code: token,
      });
      if (result.status === 'complete') {
        await activeClerk.setActive({ session: result.createdSessionId });
        return { success: true };
      }
      return { success: false, error: `Additional steps required: ${result.status}` };
    } catch (err: any) {
      logger.error('2FA verification error:', err);
      return { success: false, error: err.errors?.[0]?.message || 'رمز التحقق غير صحيح' };
    }
  }, [getClerkInstance]);

  const refreshUser = useCallback(async (options?: {clearOnFailure?: boolean;}) => {
    return !!userId;
  }, [userId]);

  const forgotPassword = useCallback(async (email: string): Promise<{success: boolean; error?: string; message?: string;}> => {
    return { success: false, error: 'Reset password managed via Clerk', message: '' };
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    return { success: false, error: 'Reset password managed via Clerk' };
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    return { success: false, error: 'Email verification managed via Clerk' };
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    return { success: false, error: 'Verification managed via Clerk' };
  }, []);

  const requestMagicLink = useCallback(async (email: string): Promise<{success: boolean; error?: string;}> => {
    const activeClerk = getClerkInstance();
    if (!activeClerk) return { success: false, error: 'Auth system not fully loaded' };
    try {
      const result = await activeClerk.client.signIn.create({
        identifier: email,
      });
      const firstFactor = result.supportedFirstFactors?.find(
          (f: any) => f.strategy === 'email_code'
      ) as any;
      if (firstFactor && firstFactor.emailAddressId) {
        await activeClerk.client.signIn.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: firstFactor.emailAddressId,
        });
        return { success: true };
      }
      return { success: false, error: 'طريقة الدخول السريع غير مدعومة لهذا الحساب' };
    } catch (err: any) {
      logger.error('Magic link request error:', err);
      return { success: false, error: err.errors?.[0]?.message || 'فشل إرسال كود الدخول السريع' };
    }
  }, [getClerkInstance]);

  const verifyOTP = useCallback(async (code: string): Promise<{success: boolean; error?: string;}> => {
    const activeClerk = getClerkInstance();
    if (!activeClerk) return { success: false, error: 'Auth system not fully loaded' };
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
    } catch (err: any) {
      logger.error('OTP verification error:', err);
      return { success: false, error: err.errors?.[0]?.message || 'رمز التحقق غير صحيح' };
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
  };
}
