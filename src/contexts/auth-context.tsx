'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { clearUserId } from '@/lib/user-utils';
import { sanitizeRedirectPath } from '@/lib/auth/navigation';

/**
 * AuthContext - Client-side authentication state management.
 * 
 * Design Decisions:
 * 1. User state is fetched from /api/auth/me on mount (not stored in localStorage)
 *    → This prevents stale state and XSS token exposure
 * 2. Auto-refresh interceptor: When an API call returns 401, the context
 *    automatically refreshes the token and retries the request
 * 3. The context provides a fetchWithAuth() function that handles
 *    token refresh transparently for all protected API calls
 */

export interface AuthUser {
    id: string;
    email: string;
    username: string | null;
    name?: string | null;
    avatar: string | null;
    role: string;
    emailVerified: boolean | null;
    phone?: string | null;
    birthDate?: string | null;
    gender?: string | null;
    city?: string | null;
    school?: string | null;
    grade?: string | null;
    bio?: string | null;
    createdAt?: string;

    lastLogin?: string;
    totalXP?: number;
    level?: number;
    currentStreak?: number;
}

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
    register: (
        email: string,
        password: string,
        username?: string
    ) => Promise<{ success: boolean; error?: string; message?: string; autoLoggedIn?: boolean }>;
    logout: (allDevices?: boolean) => Promise<void>;
    refreshUser: (options?: { clearOnFailure?: boolean }) => Promise<boolean>;
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - Wraps the app to provide authentication state.
 * 
 * On mount, it checks if the user is authenticated by calling /api/auth/me.
 * If the access token is expired, it automatically tries to refresh it.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const isRefreshing = useRef(false);
    const refreshPromise = useRef<Promise<boolean> | null>(null);

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
                const response = await fetch('/api/auth/refresh', {
                    method: 'POST',
                    credentials: 'include',
                });

                return response.ok;
            } catch {
                return false;
            } finally {
                isRefreshing.current = false;
                refreshPromise.current = null;
            }
        })();

        return refreshPromise.current;
    }, []);

    /**
     * Fetch wrapper that automatically handles 401 responses
     * by refreshing the token and retrying the request once.
     */
    const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
        });

        // If unauthorized, try refreshing the token
        if (response.status === 401) {
            const refreshed = await refreshToken();

            if (refreshed) {
                // Retry the original request with new token
                return fetch(url, {
                    ...options,
                    credentials: 'include',
                });
            }

            // Refresh failed - user needs to login again
            setUser(null);
            if (typeof window !== 'undefined') {
                const fullPath = `${window.location.pathname}${window.location.search}`;
                const redirectPath = sanitizeRedirectPath(fullPath, '/');
                const loginUrl = redirectPath === '/login'
                    ? '/login'
                    : `/login?redirect=${encodeURIComponent(redirectPath)}`;
                router.replace(loginUrl);
            } else {
                router.replace('/login');
            }
        }

        return response;
    }, [refreshToken, router]);

    /**
     * Fetch current user profile from the server.
     * Called on mount and after login to sync state.
     */
    const refreshUser = useCallback(async (options?: { clearOnFailure?: boolean }) => {
        const clearOnFailure = options?.clearOnFailure ?? true;

        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                return true;
            }

            // If 401, try refreshing token
            if (response.status === 401) {
                const refreshed = await refreshToken();

                if (refreshed) {
                    // Retry fetching user
                    const retryResponse = await fetch('/api/auth/me', {
                        credentials: 'include',
                    });

                    if (retryResponse.ok) {
                        const data = await retryResponse.json();
                        setUser(data.user);
                        return true;
                    }
                }
            }

            if (clearOnFailure) {
                setUser(null);
            }
            return false;
        } catch {
            if (clearOnFailure) {
                setUser(null);
            }
            return false;
        }
    }, [refreshToken]);

    /**
     * Login function - authenticates with the API and updates state.
     */
    const login = useCallback(async (
        email: string,
        password: string,
        rememberMe: boolean = false
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, rememberMe }),
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error || 'Login failed' };
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
    }, [delay, refreshUser]);

    /**
     * Register function - creates account via API.
     */
    const register = useCallback(async (
        email: string,
        password: string,
        username?: string
    ): Promise<{ success: boolean; error?: string; message?: string; autoLoggedIn?: boolean }> => {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, username }),
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || data.details?.[0] || 'Registration failed',
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
                        error: 'Unable to restore your session after registration. Please sign in.',
                    };
                }

                return {
                    success: true,
                    message: data.message,
                    autoLoggedIn: true,
                };
            }

            // Backward-compatible fallback: try immediate sign-in client-side.
            const loginResult = await login(email.trim().toLowerCase(), password, false);
            if (loginResult.success) {
                return { success: true, message: data.message, autoLoggedIn: true };
            }

            return { success: true, message: data.message, autoLoggedIn: false };
        } catch {
            return { success: false, error: 'Network error. Please try again.' };
        }
    }, [delay, login, refreshUser]);

    /**
     * Logout function - clears session and redirects to login.
     */
    const logout = useCallback(async (allDevices: boolean = false) => {
        try {
            await fetch(`/api/auth/logout${allDevices ? '?all=true' : ''}`, {
                method: 'POST',
                credentials: 'include',
                cache: 'no-store',
            });
        } catch {
            // Even if API call fails, clear local state
        }

        setUser(null);
        clearUserId();
        router.replace('/login');
        router.refresh();
    }, [router]);

    // Check auth state on mount
    useEffect(() => {
        let mounted = true;

        const checkAuth = async () => {
            await refreshUser();
            if (mounted) {
                setIsLoading(false);
            }
        };

        checkAuth();

        return () => {
            mounted = false;
        };
    }, [refreshUser]);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        fetchWithAuth,
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

export default AuthContext;
