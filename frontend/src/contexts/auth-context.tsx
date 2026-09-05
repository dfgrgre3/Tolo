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
  useMemo,
  useState,
} from "react";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { requestCache } from "@/lib/api/request-cache";
import { setSessionPresence } from "@/lib/api/redirect-loop-guard";
import { apiRoutes } from "@/lib/api/routes";
import { getDeviceFingerprint } from "@/lib/auth/device-fingerprint";
import { login as loginRequest, verifyMfa as verifyMfaRequest } from "@/services/auth/login-service";

/**
 * Result of an explicit credential-based login (admin or normal).
 */
export interface AuthLoginResult {
  success: boolean;
  requiresMfa?: boolean;
  /** Opaque MFA challenge handle to pass to `verifyMfa`. */
  challengeId?: string | null;
  error?: string | null;
}

// API Response Types
export interface AuthMeResponse {
  user: AuthUser;
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
  /** Complete an MFA challenge during sign-in. */
  verifyMfa: (
    challengeId: string,
    code: string
  ) => Promise<AuthLoginResult>;
  /** @deprecated Use redirectToLogin instead */
  login: () => Promise<void>;
  /** @deprecated Use redirectToRegister instead */
  register: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Signed-out state — shared so every failure path resets identically. */
const GUEST_STATE: AuthState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

/**
 * Builds the `/auth/me` URL with cache-busting query params.
 *
 * WHY: `requestCache` memoizes GET responses for 5 minutes, including the 401
 * a guest receives. Without busting it, a user who loaded the page while signed
 * out would keep reading that cached 401 for 5 minutes after signing in — the
 * login would appear to succeed and then immediately fail.
 */
function buildMeUrl(): string {
  return `${apiRoutes.auth.me}?refresh=true&_t=${Date.now()}`;
}

/** Maps a failed `/auth/me` into guest state, distinguishing 401 from a real fault. */
function guestStateFromError(err: unknown): AuthState {
  const is401 = err instanceof ApiError && err.status === 401;
  return {
    ...GUEST_STATE,
    // A 401 is the expected answer for a guest, not an error worth surfacing.
    error: is401 ? null : "تعذر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.",
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // Fetch current user exactly once on mount
  useEffect(() => {
    const controller = new AbortController();

    const fetchUser = async () => {
      try {
        const data = await apiClient.get<AuthMeResponse>(buildMeUrl(), {
          signal: controller.signal,
        });

        // A 200 with no user object means the backend contract broke; treating
        // it as authenticated would leave `user` null behind an auth guard.
        if (!data?.user) {
          requestCache.setIdentity(null);
          setState({ ...GUEST_STATE, error: "استجابة غير صالحة من الخادم" });
          return;
        }

        // Bind user-scoped cache entries to this identity (see request-cache.ts).
        // The identity itself is never cached in localStorage — the session is
        // the single source of identity.
        requestCache.setIdentity(data.user.id);

        setState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        requestCache.setIdentity(null);
        setState(guestStateFromError(err));
      }
    };

    fetchUser();

    return () => {
      controller.abort();
    };
  }, []);

  // Report session presence to the API layer: a 401 may only auto-redirect
  // to /login for a browser that actually HAD a session. Guests keep their
  // empty states instead of being bounced (see redirect-loop-guard.ts).
  useEffect(() => {
    if (state.isLoading) return; // still resolving — stay 'unknown'
    setSessionPresence(state.isAuthenticated ? "present" : "absent");
  }, [state.isAuthenticated, state.isLoading]);

  const redirectToLogin = useCallback(async () => {
    window.location.href = "/login";
  }, []);

  const redirectToRegister = useCallback(async () => {
    window.location.href = "/register";
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post<void>(apiRoutes.auth.logout, {});
    } catch {
      // A failed logout call must not trap the user in a signed-in UI — the
      // local state is cleared and we navigate away regardless.
    }
    // Drop any cached authenticated data (e.g. /auth/me with its 5-min TTL) so
    // the next authenticated fetch reflects the logged-out state immediately.
    requestCache.clear();
    requestCache.setIdentity(null);
    setState(GUEST_STATE);
    window.location.href = "/login";
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      requestCache.clear();
      const data = await apiClient.get<AuthMeResponse>(buildMeUrl());

      if (!data?.user) {
        requestCache.setIdentity(null);
        setState({ ...GUEST_STATE, error: "استجابة غير صالحة من الخادم" });
        return false;
      }

      // Bind user-scoped cache entries to the (possibly new) identity — this
      // is what prevents the previous user's data from being replayed after
      // an in-session login switch (see request-cache.ts).
      requestCache.setIdentity(data.user.id);

      setState({
        user: data.user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
      return true;
    } catch (err: unknown) {
      requestCache.setIdentity(null);
      setState(guestStateFromError(err));
      return false;
    }
  }, []);

  /**
   * Sign in with email/password (used by both the normal and the admin login
   * flows). Delegates to the shared login service so this path and `LoginForm`
   * send an identical payload. When the account has MFA enabled the result
   * carries `requiresMfa` plus the challenge handle for `verifyMfa`.
   */
  const adminLogin = useCallback(
    async (
      identifier: string,
      password: string,
      remember: boolean = false
    ): Promise<AuthLoginResult> => {
      const result = await loginRequest({
        email: identifier,
        password,
        rememberMe: remember,
        fingerprint: getDeviceFingerprint(),
      });

      if (result.requiresMfa) {
        return { success: false, requiresMfa: true, challengeId: result.challengeId };
      }

      if (!result.success) {
        return { success: false, error: result.error ?? "فشل تسجيل الدخول" };
      }

      // The session cookie is set; load the user so guards see the new role.
      const refreshed = await refreshUser();
      return refreshed
        ? { success: true }
        : { success: false, error: "تعذر تحميل بيانات المستخدم بعد تسجيل الدخول" };
    },
    [refreshUser]
  );

  /**
   * Completes an MFA challenge started by `adminLogin`. `challengeId` is the
   * opaque handle returned in that call's result.
   */
  const verifyMfa = useCallback(
    async (challengeId: string, code: string): Promise<AuthLoginResult> => {
      const result = await verifyMfaRequest(challengeId, code);

      if (!result.success) {
        return { success: false, error: result.error ?? "فشل التحقق من الرمز" };
      }

      const refreshed = await refreshUser();
      return refreshed
        ? { success: true }
        : { success: false, error: "تعذر تحميل بيانات المستخدم بعد التحقق" };
    },
    [refreshUser]
  );

  // Memoized so consumers only re-render when auth state actually changes.
  // Without this, every AuthProvider render hands down a fresh object and
  // re-renders every `useAuth()` call site in the tree.
  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      redirectToLogin,
      redirectToRegister,
      logout,
      adminLogin,
      verifyMfa,
      refreshUser,
      // Deprecated aliases for backward compatibility
      login: redirectToLogin,
      register: redirectToRegister,
    }),
    [
      state,
      redirectToLogin,
      redirectToRegister,
      logout,
      adminLogin,
      verifyMfa,
      refreshUser,
    ]
  );

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
