"use client";

/**
 * AuthContext — singleton authentication state.
 *
 * Wraps the `useAuth` fetch logic inside a React context so that the
 * GET /auth/me request is issued exactly ONCE per page load, no matter how
 * many components call `useAuth()`.  Previously every `useAuth()` call-site
 * created its own effect and triggered its own network request (or at best
 * a "slow performance" warning because each instance started its own
 * performance timer before the request-cache deduplication could short-circuit).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { requestCache } from "@/lib/api/request-cache";
import { apiRoutes } from "@/lib/api/routes";

/**
 * Result of an explicit credential-based login (admin or normal).
 */
export interface AuthLoginResult {
  success: boolean;
  requires2FA?: boolean;
  userId?: string | null;
  error?: string | null;
}

// API Response Types
export interface AuthMeResponse {
  user: AuthUser;
}

export interface LoginResponse {
  mfaRequired?: boolean;
  ticket?: string | null;
  userId?: string | null;
}

// ─── Types (re-exported for convenience) ────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  avatar: string | null;
  role: string;
  permissions: string[];
  phone: string | null;
  school: string | null;
  bio: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  status?: string;
  createdAt: string | null;
  lastLogin: string | null;

  // Profile fields
  alternativePhone?: string | null;
  dateOfBirth?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  country?: string | null;
  city?: string | null;
  gradeLevel?: string | null;
  educationType?: string | null;
  section?: string | null;
  studyGoal?: string | null;
  subjectsTaught?: string[];
  experienceYears?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  /** Redirect to login page (for protected routes) */
  redirectToLogin: () => Promise<void>;
  /** Redirect to registration page */
  redirectToRegister: () => Promise<void>;
  /** Logout and clear session */
  logout: () => Promise<void>;
  /** Refresh current user data from server */
  refreshUser: () => Promise<boolean>;
  /** Sign in with email/password. Returns whether MFA is required. */
  adminLogin: (
    identifier: string,
    password: string,
    remember?: boolean
  ) => Promise<AuthLoginResult>;
  /** Complete a 2FA challenge during sign-in. */
  verify2FA: (
    userId: string,
    code: string
  ) => Promise<AuthLoginResult>;
  /** Fetch with authentication headers (for external APIs) */
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });
  const fetchRef = useRef<AbortController | null>(null);

  // Fetch current user exactly once on mount
  useEffect(() => {
    if (fetchRef.current) {
      fetchRef.current.abort();
    }

    const controller = new AbortController();
    fetchRef.current = controller;

    const fetchUser = async () => {
      try {
        const data = await apiClient.get<AuthMeResponse>("/auth/me", {
          signal: controller.signal,
        });

        const userData: AuthUser = data?.user;
        setState({
          user: userData,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const is401 = err instanceof ApiError && err.status === 401;
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: is401 ? null : "Network error",
        });
      }
    };

    fetchUser();

    return () => {
      controller.abort();
    };
  }, []);

  const redirectToLogin = useCallback(async () => {
    window.location.href = "/login";
  }, []);

  const redirectToRegister = useCallback(async () => {
    window.location.href = "/register";
  }, []);

  // Deprecated aliases for backward compatibility - use redirectToLogin/redirectToRegister instead
  const login = redirectToLogin;
  const register = redirectToRegister;

  const logout = useCallback(async () => {
    try {
      await apiClient.post<void>('/auth/logout', {});
    } catch {
      // Ignore errors
    }
    // Drop any cached authenticated data (e.g. /auth/me with its 5-min TTL) so
    // the next authenticated fetch reflects the logged-out state immediately.
    requestCache.clear();
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
    window.location.href = "/login";
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiClient.get<AuthMeResponse>("/auth/me");
      const userData: AuthUser = data?.user;
      setState({
        user: userData,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
      return true;
    } catch (err: unknown) {
      const is401 = err instanceof ApiError && err.status === 401;
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: is401 ? null : "Network error",
      });
      return false;
    }
  }, []);

  /**
   * Sign in with email/password (used by both the normal and the admin login
   * flows). Routes through the backend `/auth/login` endpoint; when the account
   * has 2FA enabled the backend responds with `mfaRequired` and the caller
   * should then call `verify2FA`.
   */
  const adminLogin = useCallback(
    async (
      identifier: string,
      password: string,
      remember: boolean = false
    ): Promise<AuthLoginResult> => {
      try {
        const deviceName =
          typeof window !== "undefined"
            ? `${navigator.platform} (${navigator.language})`
            : "Unknown Device";

        const data = await apiClient.post<LoginResponse>(apiRoutes.auth.login, {
          identifier,
          password,
          rememberMe: remember,
          deviceName,
        });

        if (data?.mfaRequired) {
          return {
            success: false,
            requires2FA: true,
            userId: data.userId ?? null,
          };
        }

        await refreshUser();
        return { success: true };
      } catch (err: unknown) {
        const message =
          err instanceof ApiError || err instanceof Error
            ? err.message
            : "فشل تسجيل الدخول";
        return { success: false, error: message };
      }
    },
    [refreshUser]
  );

  /**
   * Completes a 2FA challenge started by `adminLogin`. The backend validates the
   * code and issues the session, then we refresh the current user.
   */
  const verify2FA = useCallback(
    async (userId: string, code: string): Promise<AuthLoginResult> => {
      try {
        await apiClient.post(apiRoutes.auth.mfa.verify, {
          userId,
          code,
        });
        await refreshUser();
        return { success: true };
      } catch (err: unknown) {
        const message =
          err instanceof ApiError || err instanceof Error
            ? err.message
            : "فشل التحقق من الرمز";
        return { success: false, error: message };
      }
    },
    [refreshUser]
  );

  const fetchWithAuth = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const endpoint = typeof input === "string" ? input : input.toString();
      return apiClient.fetch(endpoint, init);
    },
    []
  );

  const value: AuthContextValue = {
    ...state,
    redirectToLogin,
    redirectToRegister,
    logout,
    adminLogin,
    verify2FA,
    refreshUser,
    fetchWithAuth,
    // Deprecated aliases for backward compatibility
    login: redirectToLogin,
    register: redirectToRegister,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useAuthContext — reads auth state from the singleton AuthContext.
 * Must be called within an <AuthProvider>.
 */
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuthContext must be used within an <AuthProvider>");
  }
  return ctx;
}
