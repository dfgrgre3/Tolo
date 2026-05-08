'use client';

import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { clearUserId } from '@/lib/user-utils';
import { useAuthStore, type AuthUser } from '@/lib/auth/auth-store';
import { apiRoutes } from '@/lib/api/routes';
import { logger } from '@/lib/logger';

// Local definition of buildLoginUrl (was previously imported incorrectly)
const buildLoginUrl = (redirect?: string): string => {
  return redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login';
};

const isTimeoutError = (error: unknown) => {
  return error === 'timeout' || 
    (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout')));
};

const createAbortTimeout = (ms: number = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    try {
      controller.abort('timeout');
    } catch (e) {
      controller.abort();
    }
  }, ms);
  return { controller, timeoutId };
};

const fetchWithTimeout = async (url: string, options: RequestInit, ms: number = 10000) => {
  const { controller, timeoutId } = createAbortTimeout(ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * AuthContext - Client-side authentication state management.
 * (Now backed by Zustand for better performance and smaller context size)
 */

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{success: boolean; requires2FA?: boolean; userId?: string; error?: string;}>;
  register: (
  data: {
    email: string;
    password: string;
    username?: string;
    role?: string;
    country?: string;
    dateOfBirth?: string | null;
    gender?: string;
    phone?: string;
    alternativePhone?: string;
    gradeLevel?: string;
    educationType?: string;
    section?: string;
    interestedSubjects?: string[];
    studyGoal?: string;
    subjectsTaught?: string[];
    classesTaught?: string[];
    experienceYears?: string;
  }
  ) => Promise<{success: boolean; error?: string; message?: string; autoLoggedIn?: boolean;}>;
  logout: (allDevices?: boolean) => Promise<void>;
  verify2FA: (userId: string, token: string, rememberMe?: boolean) => Promise<{success: boolean; error?: string;}>;
  refreshUser: (options?: {clearOnFailure?: boolean;}) => Promise<boolean>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  forgotPassword: (email: string) => Promise<{success: boolean; error?: string; message?: string;}>;
  resetPassword: (token: string, newPassword: string) => Promise<{success: boolean; error?: string;}>;
  verifyEmail: (token: string) => Promise<{success: boolean; error?: string;}>;
  resendVerification: (email: string) => Promise<{success: boolean; error?: string;}>;
  requestMagicLink: (email: string) => Promise<{success: boolean; error?: string;}>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - Wraps the app to provide authentication state.
 * Syncs internal logic with useAuthStore.
 */
export function AuthProvider({
  children,
  initialAuthHint = true
}: {children: React.ReactNode; initialAuthHint?: boolean;}) {
  const {
    user,
    isLoading,
    setIsLoading,
    setUser,
    reset: _resetStore,
    isRefreshing: _isRefreshingStore,
    setIsRefreshing: _setIsRefreshingStore
  } = useAuthStore();

  const router = useRouter();
  const isRefreshing = useRef(false);
  const refreshPromise = useRef<Promise<boolean> | null>(null);
  const _userFetchPromise = useRef<Promise<boolean> | null>(null);

  // Ensure isLoading reflects initialAuthHint on server-side hint
  useEffect(() => {
    if (initialAuthHint !== undefined && !user) {
      setIsLoading(initialAuthHint);
    }
  }, [initialAuthHint, user, setIsLoading]);

  const delay = useCallback((ms: number) => {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }, []);

  /**
   * Attempt to refresh the access token.
   * Uses a ref to ensure only one refresh happens at a time (deduplication).
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    // If already refreshing, wait for the existing promise
    if (isRefreshing.current && refreshPromise.current) {
      return refreshPromise.current;
    }

    isRefreshing.current = true;

    refreshPromise.current = (async () => {
      try {
        const response = await fetchWithTimeout(apiRoutes.auth.refresh, {
          method: 'POST',
          credentials: 'include'
        }, 10000);

        return response.ok;
      } catch (error) {
        if (isTimeoutError(error)) {
          logger.warn('refreshToken timed out after 10s');
        } else {
          logger.error('refreshToken unexpected error:', error);
        }
        return false;
      } finally {
        isRefreshing.current = false;
        refreshPromise.current = null;
      }
    })();

    return refreshPromise.current;
  }, []);

  /**
   * Fetch wrapper that automatically handles 401 responses.
   * On 401, we attempt /api/auth/refresh once, then retry the original request.
   * This is used for API calls OTHER than /api/auth/me (which handles refresh internally).
   */
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const response = await fetch(url, {
      ...options,
      credentials: 'include'
    });

    if (response.status === 401) {
      // Try to refresh via the dedicated endpoint
      const refreshed = await refreshToken();

      if (refreshed) {
        // Retry the original request with new token
        return fetch(url, {
          ...options,
          credentials: 'include'
        });
      }

      // Refresh failed - user needs to login again
      setUser(null);
      clearUserId();
      if (typeof window !== 'undefined') {
        const fullPath = `${window.location.pathname}${window.location.search}`;
        const redirectPath = sanitizeRedirectPath(fullPath, '/');
        const loginUrl = redirectPath === '/login' ?
          '/login' :
          `/login?redirect=${encodeURIComponent(redirectPath)}`;
        router.replace(loginUrl);
      } else {
        router.replace('/login');
      }
    }

    return response;
  }, [refreshToken, router, setUser]);

  const attemptUserFetch = useCallback(async () => {
    const response = await fetchWithTimeout('/api/auth/me', {
      credentials: 'include',
      cache: 'no-store'
    });
    
    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
      return true;
    }
    return false;
  }, [setUser]);

  const handle401Retry = useCallback(async () => {
    const refreshed = await refreshToken();
    if (!refreshed) return false;

    try {
      return await attemptUserFetch();
    } catch (retryError) {
      if (isTimeoutError(retryError)) {
        logger.warn('refreshUser retry timed out');
        return false;
      }
      throw retryError;
    }
  }, [refreshToken, attemptUserFetch]);

  /**
   * Fetch current user profile from the server.
   * Centralizes auth state restoration.
   */
  const refreshUser = useCallback(async (options?: {clearOnFailure?: boolean;}) => {
    const clearOnFailure = options?.clearOnFailure ?? true;

    // Deduplicate concurrent user refresh calls to prevent hammering the server
    // and overlapping timeouts.
    if (_userFetchPromise.current) {
      return _userFetchPromise.current;
    }

    _userFetchPromise.current = (async () => {
      try {
        // Priority: if we're already refreshing tokens, wait for that first
        if (isRefreshing.current && refreshPromise.current) {
          try {
            await refreshPromise.current;
          } catch (e) {
            // Ignore refresh promise errors here as we'll handle failure in the fetch
          }
        }

        const response = await fetchWithTimeout('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store'
        });

        if (response.status === 401) {
          const success = await handle401Retry();
          if (success) return true;
        } else if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          return true;
        }

        if (clearOnFailure) {
          setUser(null);
          clearUserId();
        }
        return false;
      } catch (error) {
        if (isTimeoutError(error)) {
          logger.warn('refreshUser timed out or was aborted (background check)');
        } else {
          logger.error('refreshUser error:', error);
        }

        if (clearOnFailure) {
          setUser(null);
          clearUserId();
        }
        return false;
      } finally {
        _userFetchPromise.current = null;
      }
    })();

    return _userFetchPromise.current;
  }, [handle401Retry, setUser]);

  /**
   * Login function - authenticates with the API and updates state.
   */
  const login = useCallback(async (
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<{success: boolean; requires2FA?: boolean; userId?: string; error?: string;}> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      // If 2FA is required, return early with relevant data
      if (data.requires2FA) {
        return {
          success: true,
          requires2FA: true,
          userId: data.user?.id
        };
      }

      // Keep initial user payload for immediate UI updates.
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          username: data.user.username ?? null,
          name: data.user.name ?? data.user.username ?? null,
          avatar: data.user.avatar ?? null,
          role: data.user.role ?? 'USER',
          emailVerified: data.user.emailVerified ?? null,
          phoneVerified: data.user.phoneVerified ?? null,
          permissions: data.user.permissions ?? []
        });
      }

      // Post-login hydration can race with cookie persistence in some browsers.
      // Give a tiny initial delay for cookies to settle, then retry briefly.
      await delay(50);
      let hydrated = await refreshUser({ clearOnFailure: false });
      if (!hydrated) {
        await delay(150);
        hydrated = await refreshUser({ clearOnFailure: false });
      }
      if (!hydrated) {
        await delay(300);
        hydrated = await refreshUser({ clearOnFailure: false });
      }

      if (!hydrated && !data.user) {
        setUser(null);
        return { success: false, error: 'Unable to restore your session. Please try again.' };
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, [delay, refreshUser, setUser]);

  /**
   * Verify 2FA token and complete login.
   */
  const verify2FA = useCallback(async (
    userId: string,
    token: string,
    rememberMe: boolean = false
  ): Promise<{success: boolean; error?: string;}> => {
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token, rememberMe }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || '2FA verification failed' };
      }

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          username: data.user.username ?? null,
          name: data.user.name ?? data.user.username ?? null,
          avatar: data.user.avatar ?? null,
          role: data.user.role ?? 'USER',
          emailVerified: data.user.emailVerified ?? null,
          phoneVerified: data.user.phoneVerified ?? null,
          permissions: data.user.permissions ?? []
        });
      }

      await delay(50);
      await refreshUser({ clearOnFailure: false });

      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, [delay, refreshUser, setUser]);

  /**
   * Register function - creates account via API.
   */
  const register = useCallback(async (
    dataPayload: {
      email: string;
      password: string;
      username?: string;
      role?: string;
      country?: string;
      dateOfBirth?: string | null;
      gender?: string;
      phone?: string;
      alternativePhone?: string;
      gradeLevel?: string;
      educationType?: string;
      section?: string;
      interestedSubjects?: string[];
      studyGoal?: string;
      subjectsTaught?: string[];
      classesTaught?: string[];
      experienceYears?: string;
    }
  ): Promise<{success: boolean; error?: string; message?: string; autoLoggedIn?: boolean;}> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataPayload),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.details?.[0] || 'Registration failed'
        };
      }

      // Prefer server-driven auto-login from /api/auth/register when available.
      if (data?.autoLoggedIn === true) {
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            username: data.user.username ?? null,
            name: data.user.name ?? data.user.username ?? null,
            avatar: data.user.avatar ?? null,
            role: data.user.role ?? 'USER',
            emailVerified: data.user.emailVerified ?? null,
            phoneVerified: data.user.phoneVerified ?? null,
            permissions: data.user.permissions ?? []
          });
        }

        await delay(50);
        let hydrated = await refreshUser({ clearOnFailure: false });
        if (!hydrated) {
          await delay(150);
          hydrated = await refreshUser({ clearOnFailure: false });
        }
        if (!hydrated) {
          await delay(300);
          hydrated = await refreshUser({ clearOnFailure: false });
        }

        if (!hydrated && !data.user) {
          setUser(null);
          return {
            success: false,
            error: 'Unable to restore your session after registration. Please sign in.'
          };
        }

        return {
          success: true,
          message: data.message,
          autoLoggedIn: true
        };
      }

      // Backward-compatible fallback: try immediate sign-in client-side.
      const loginResult = await login(dataPayload.email.trim().toLowerCase(), dataPayload.password, false);
      if (loginResult.success) {
        return { success: true, message: data.message, autoLoggedIn: true };
      }

      return { success: true, message: data.message, autoLoggedIn: false };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, [delay, login, refreshUser, setUser]);

  /**
   * Logout function - clears session and redirects to login.
   */
  const logout = useCallback(async (allDevices: boolean = false) => {
    try {
      await fetch(`/api/auth/logout${allDevices ? '?all=true' : ''}`, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000) // 5s timeout for logout
      });
    } catch {
      // Even if API call fails, clear local state
    }
    setUser(null);
    clearUserId();
    router.replace('/login');
    router.refresh();
  }, [router, setUser]);

  // Check auth state on mount
  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      if (initialAuthHint === false) {
        setIsLoading(false);
        return;
      }
      try {
        await refreshUser();
      } catch {
        // Ensure loading stops even on unexpected errors
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    // Safety timeout: force isLoading to false after 8s to prevent permanent loading screen
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
      }
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
    };
  }, [refreshUser, setIsLoading]);

  const sanitizeRedirectPath = (path: string, fallback: string = '/'): string => {
    if (!path || path.includes('//') || !path.startsWith('/')) return fallback;
    return path;
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    verify2FA,
    refreshUser,
    fetchWithAuth,
    forgotPassword: async (email: string) => {
      try {
        const res = await fetch(apiRoutes.auth.forgotPassword, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        return { success: res.ok, ...data };
      } catch (err) {
        return { success: false, error: 'Network error' };
      }
    },
    resetPassword: async (token: string, newPassword: string) => {
      try {
        const res = await fetch(apiRoutes.auth.resetPassword, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword })
        });
        const data = await res.json();
        return { success: res.ok, ...data };
      } catch (err) {
        return { success: false, error: 'Network error' };
      }
    },
    verifyEmail: async (token: string) => {
      try {
        const res = await fetch(`${apiRoutes.auth.verifyEmail}?token=${token}`);
        const data = await res.json();
        return { success: res.ok, ...data };
      } catch (err) {
        return { success: false, error: 'Network error' };
      }
    },
    resendVerification: async (email: string) => {
      try {
        const res = await fetch(apiRoutes.auth.resendVerification, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        return { success: res.ok, ...data };
      } catch (err) {
        return { success: false, error: 'Network error' };
      }
    },
    requestMagicLink: async (email: string) => {
      try {
        const res = await fetch(apiRoutes.auth.magicLink.request, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        return { success: res.ok, ...data };
      } catch (err) {
        return { success: false, error: 'Network error' };
      }
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth hook - Provides access to the authentication context.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
