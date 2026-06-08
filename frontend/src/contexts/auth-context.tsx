'use client';

import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useClerkAuth, useUser as useClerkUser, useSignIn, useSignUp } from '@clerk/nextjs';
import { useAuthStore, type AuthUser } from '@/lib/auth/auth-store';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialLoad: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{success: boolean; requires2FA?: boolean; userId?: string; error?: string;}>;
  adminLogin: (email: string, password: string, rememberMe?: boolean) => Promise<{success: boolean; requires2FA?: boolean; userId?: string; error?: string;}>;
  register: (
    data: {
      email: string;
      password: string;
      username?: string;
      role?: string;
    }
  ) => Promise<{success: boolean; error?: string; message?: string; autoLoggedIn?: boolean;}>;
  logout: (allDevices?: boolean) => Promise<void>;
  verify2FA: (userId: string, token: string, rememberMe?: boolean) => Promise<{success: boolean; error?: string;}>;
  refreshUser: (options?: {clearOnFailure?: boolean;}) => Promise<boolean>;
  fetchWithAuth: (...args: Parameters<typeof fetch>) => Promise<Response>;
  forgotPassword: (email: string) => Promise<{success: boolean; error?: string; message?: string;}>;
  resetPassword: (token: string, newPassword: string) => Promise<{success: boolean; error?: string;}>;
  verifyEmail: (token: string) => Promise<{success: boolean; error?: string;}>;
  resendVerification: (email: string) => Promise<{success: boolean; error?: string;}>;
  requestMagicLink: (email: string) => Promise<{success: boolean; error?: string;}>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialAuthHint,
}: {children: React.ReactNode; initialAuthHint?: boolean;}) {
  const router = useRouter();
  const { isLoaded: isClerkLoaded, userId, getToken, signOut } = useClerkAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useClerkUser();
  const { signIn } = useSignIn() as any;
  const { signUp } = useSignUp() as any;
  
  const { user: storeUser, setUser, reset: resetStore } = useAuthStore();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Map Clerk user to local AuthUser model and sync with Zustand store
  useEffect(() => {
    if (isClerkLoaded && isUserLoaded) {
      if (clerkUser) {
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
      } else {
        resetStore();
      }
      setIsInitialLoad(false);
    }
  }, [clerkUser, isClerkLoaded, isUserLoaded, setUser, resetStore]);

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

  const login = useCallback(async (email: string, password: string): Promise<{success: boolean; error?: string;}> => {
    if (!signIn) return { success: false, error: 'Auth system not fully loaded' };
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });
      if (result.status === 'complete') {
        return { success: true };
      }
      return { success: false, error: `Additional steps required: ${result.status}` };
    } catch (err: any) {
      logger.error('Login error:', err);
      return { success: false, error: err.errors?.[0]?.message || 'Login failed' };
    }
  }, [signIn]);

  const adminLogin = useCallback(async (email: string, password: string): Promise<{success: boolean; error?: string;}> => {
    // Admin login goes through Clerk sign in, role restriction verified on backend
    return login(email, password);
  }, [login]);

  const register = useCallback(async (data: { email: string; password: string; username?: string }): Promise<{success: boolean; error?: string;}> => {
    if (!signUp) return { success: false, error: 'Auth system not fully loaded' };
    try {
      await signUp.create({
        emailAddress: data.email,
        password: data.password,
        username: data.username,
      });
      return { success: true };
    } catch (err: any) {
      logger.error('Registration error:', err);
      return { success: false, error: err.errors?.[0]?.message || 'Registration failed' };
    }
  }, [signUp]);

  const logout = useCallback(async () => {
    await signOut();
    resetStore();
    router.replace('/login');
  }, [signOut, resetStore, router]);

  const verify2FA = useCallback(async () => {
    return { success: false, error: '2FA managed by Clerk' };
  }, []);

  const refreshUser = useCallback(async () => {
    return !!userId;
  }, [userId]);

  const forgotPassword = useCallback(async () => {
    return { success: false, error: 'Reset password managed via Clerk' };
  }, []);

  const resetPassword = useCallback(async () => {
    return { success: false, error: 'Reset password managed via Clerk' };
  }, []);

  const verifyEmail = useCallback(async () => {
    return { success: false, error: 'Email verification managed via Clerk' };
  }, []);

  const resendVerification = useCallback(async () => {
    return { success: false, error: 'Verification managed via Clerk' };
  }, []);

  const requestMagicLink = useCallback(async () => {
    return { success: false, error: 'Magic links managed via Clerk' };
  }, []);

  const value: AuthContextType = {
    user: storeUser,
    isLoading: !isClerkLoaded || !isUserLoaded,
    isAuthenticated: !!userId,
    isInitialLoad,
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
