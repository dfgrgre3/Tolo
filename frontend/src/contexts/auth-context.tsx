'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useClerkAuth, useUser as useClerkUser, useSignIn, useSignUp } from '@clerk/nextjs';
import { useAuthStore, type AuthUser } from '@/lib/auth/auth-store';
import { logger } from '@/lib/logger';

export function AuthProvider({
  children,
  initialAuthHint,
}: {children: React.ReactNode; initialAuthHint?: boolean;}) {
  const { isLoaded: isClerkLoaded, userId } = useClerkAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useClerkUser();
  const { user: storeUser, setUser, reset: resetStore } = useAuthStore();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Map Clerk user to local AuthUser model and sync with Zustand store
  useEffect(() => {
    if (isClerkLoaded) {
      if (!userId) {
        resetStore();
        setIsInitialLoad(false);
        return;
      }

      if (isUserLoaded && clerkUser) {
        const mappedUser: AuthUser = {
          id: clerkUser.id,
          email: '', // Excluded initially to prevent leakage in SSR serialization
          username: clerkUser.username || null,
          name: clerkUser.fullName || clerkUser.username || null,
          avatar: clerkUser.imageUrl || null,
          role: (clerkUser.publicMetadata?.role as string) || 'USER',
          emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
          permissions: [], // Excluded initially
        };
        setUser(mappedUser);

        // Asynchronously load detailed secure profile data from secure backend RPC
        import('@/lib/rpc-client').then(async ({ authClient }) => {
          try {
            const profile = await authClient.getProfile({});
            if (profile.user) {
              setUser({
                ...mappedUser,
                email: profile.user.email,
                role: profile.user.role || mappedUser.role,
                permissions: (clerkUser.publicMetadata?.permissions as string[]) || [],
              });
            }
          } catch (e) {
            logger.error('Failed to load secure profile details via RPC:', e);
            // Safe fallback to client-side Clerk attributes on failure
            setUser({
              ...mappedUser,
              email: clerkUser.emailAddresses[0]?.emailAddress || '',
              permissions: (clerkUser.publicMetadata?.permissions as string[]) || [],
            });
          }
        });
        setIsInitialLoad(false);
      }
    }
  }, [clerkUser, isClerkLoaded, isUserLoaded, userId, setUser, resetStore]);

  return <>{children}</>;
}

export function useAuth() {
  const router = useRouter();
  const { isLoaded: isClerkLoaded, userId, getToken, signOut } = useClerkAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useClerkUser();
  const { signIn, setActive: setSignInActive } = useSignIn() as any;
  const { signUp, setActive: setSignUpActive } = useSignUp() as any;
  
  const user = useAuthStore((state) => state.user);
  const isStoreLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const resetStore = useAuthStore((state) => state.reset);
  
  const isLoading = !isClerkLoaded || (userId ? !isUserLoaded || isStoreLoading : false);

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
    if (!signIn || !setSignInActive) return { success: false, error: 'Auth system not fully loaded' };
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });
      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        return { success: true };
      }
      return { success: false, error: `Additional steps required: ${result.status}` };
    } catch (err: any) {
      logger.error('Login error:', err);
      return { success: false, error: err.errors?.[0]?.message || 'Login failed' };
    }
  }, [signIn, setSignInActive]);

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
    if (!signUp || !setSignUpActive) return { success: false, error: 'Auth system not fully loaded' };
    try {
      const result = await signUp.create({
        emailAddress: data.email,
        password: data.password,
        username: data.username,
      });
      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId });
        return { success: true, autoLoggedIn: true };
      }
      return { success: true, autoLoggedIn: false };
    } catch (err: any) {
      logger.error('Registration error:', err);
      return { success: false, error: err.errors?.[0]?.message || 'Registration failed' };
    }
  }, [signUp, setSignUpActive]);

  const logout = useCallback(async (allDevices?: boolean) => {
    await signOut();
    resetStore();
    router.replace('/login');
  }, [signOut, resetStore, router]);

  const verify2FA = useCallback(async (userId: string, token: string, rememberMe?: boolean) => {
    return { success: false, error: '2FA managed by Clerk' };
  }, []);

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
    if (!signIn) return { success: false, error: 'Auth system not fully loaded' };
    try {
      const result = await signIn.create({
        identifier: email,
      });
      const firstFactor = result.supportedFirstFactors.find(
        (f: any) => f.strategy === 'email_code'
      );
      if (firstFactor) {
        await signIn.prepareFirstFactor({
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
  }, [signIn]);

  const verifyOTP = useCallback(async (code: string): Promise<{success: boolean; error?: string;}> => {
    if (!signIn || !setSignInActive) return { success: false, error: 'Auth system not fully loaded' };
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code,
      });
      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        return { success: true };
      }
      return { success: false, error: `خطوة إضافية مطلوبة: ${result.status}` };
    } catch (err: any) {
      logger.error('OTP verification error:', err);
      return { success: false, error: err.errors?.[0]?.message || 'رمز التحقق غير صحيح' };
    }
  }, [signIn, setSignInActive]);

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
