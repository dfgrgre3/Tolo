'use client';

import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { clearUserId } from '@/lib/user-utils';
import { sanitizeRedirectPath } from '@/services/auth/navigation';
import { useAuthStore, type AuthUser } from '@/lib/auth/auth-store';

import { logger } from '@/lib/logger';

/**
 * AuthContext - Client-side authentication state management.
 * (Now backed by Zustand for better performance and smaller context size)
 */

export type { AuthUser };

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; requires2FA?: boolean; userId?: string; error?: string }>;
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
    ) => Promise<{ success: boolean; error?: string; message?: string; autoLoggedIn?: boolean }>;
    logout: (allDevices?: boolean) => Promise<void>;
    verify2FA: (userId: string, token: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
    refreshUser: (options?: { clearOnFailure?: boolean }) => Promise<boolean>;
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - Wraps the app to provide authentication state.
 * Syncs internal logic with useAuthStore.
 */
export function AuthProvider({ 
    children, 
    initialAuthHint = true 
}: { 
    children: React.ReactNode; 
    initialAuthHint?: boolean;
}) {
    const { 
        user, 
        isLoading, 
        setIsLoading, 
        setUser, 
        reset: resetStore,
        isRefreshing: isRefreshingStore,
        setIsRefreshing: setIsRefreshingStore
    } = useAuthStore();
    
    const router = useRouter();
    const isRefreshing = useRef(false);
    const refreshPromise = useRef<Promise<boolean> | null>(null);
    const userFetchPromise = useRef<Promise<boolean> | null>(null);

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
     * Fetch wrapper that automatically handles 401 responses.
     * On 401, we attempt /api/auth/refresh once, then retry the original request.
     * This is used for API calls OTHER than /api/auth/me (which handles refresh internally).
     */
    const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
        });

        if (response.status === 401) {
            // Try to refresh via the dedicated endpoint
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
            clearUserId();
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
     * centralizes auth state restoration.
     */
    const refreshUser = useCallback(async (options?: { clearOnFailure?: boolean }) => {
        const clearOnFailure = options?.clearOnFailure ?? true;

        try {
            // Priority: if we're already refreshing tokens, wait for that first
            if (isRefreshing.current && refreshPromise.current) {
                await refreshPromise.current;
            }

            const response = await fetch('/api/auth/me', {
                credentials: 'include',
                cache: 'no-store',
            });

            // If it returns 401, it might be because the access token is expired
            // but the server-side /api/auth/me didn't auto-refresh (or failed).
            // We should try one explicit refresh if we haven't already.
            if (response.status === 401) {
                const refreshed = await refreshToken();
                if (refreshed) {
                    // Retry getting user with new tokens
                    const retryResponse = await fetch('/api/auth/me', {
                        credentials: 'include',
                        cache: 'no-store',
                    });
                    if (retryResponse.ok) {
                        const data = await retryResponse.json();
                        setUser(data.user);
                        return true;
                    }
                }
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
            logger.error('refreshUser error:', error);
            if (clearOnFailure) {
                setUser(null);
                clearUserId();
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
    ): Promise<{ success: boolean; requires2FA?: boolean; userId?: string; error?: string }> => {
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
                    permissions: data.user.permissions ?? [],
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
     * Verify 2FA token and complete login.
     */
    const verify2FA = useCallback(async (
        userId: string,
        token: string,
        rememberMe: boolean = false
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await fetch('/api/auth/2fa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, token, rememberMe }),
                credentials: 'include',
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
                    permissions: data.user.permissions ?? [],
                });
            }

            await delay(50);
            await refreshUser({ clearOnFailure: false });

            return { success: true };
        } catch {
            return { success: false, error: 'Network error. Please try again.' };
        }
    }, [delay, refreshUser]);

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
    ): Promise<{ success: boolean; error?: string; message?: string; autoLoggedIn?: boolean }> => {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataPayload),
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
                        phoneVerified: data.user.phoneVerified ?? null,
                        permissions: data.user.permissions ?? [],
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
            const loginResult = await login(dataPayload.email.trim().toLowerCase(), dataPayload.password, false);
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
        verify2FA,
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
