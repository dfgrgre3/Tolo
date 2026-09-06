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
import { useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { requestCache } from "@/lib/api/request-cache";
import { setSessionPresence } from "@/lib/api/redirect-loop-guard";
import type { SessionPresence } from "@/lib/api/redirect-loop-guard";
import { apiRoutes } from "@/lib/api/routes";
import { clearClientCaches } from "@/lib/cache/clear-client-caches";
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

/**
 * Canonical authentication status.
 *
 * The auth provider distinguishes four states so a transient backend outage
 * is NOT confused with "the user is a guest":
 *
 *   - "loading"      — /auth/me has not resolved yet
 *   - "authenticated"— /auth/me returned 200 with a valid user payload
 *   - "anonymous"    — /auth/me returned 401 (or 200 with no user). The user
 *                      has NO session; treat as a signed-out guest.
 *   - "unavailable"  — /auth/me failed for a reason that does NOT prove the
 *                      user is signed out (5xx, network error, timeout).
 *                      We must NOT downgrade the UI to a guest in this case,
 *                      otherwise a temporary backend outage would erase the
 *                      user's session from the client's view and could even
 *                      trigger redirect loops.
 */
export type AuthStatus = "loading" | "authenticated" | "anonymous" | "unavailable";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Canonical status — supersedes the boolean `isAuthenticated` for new code. */
  status: AuthStatus;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  /** Increments whenever the session is established, refreshed, or cleared. */
  authSessionVersion: number;
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

/** Signed-out state — shared so every anonymous path resets identically. */
const ANONYMOUS_STATE: AuthState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  status: "anonymous",
  error: null,
};

/**
 * Canonical `/auth/me` endpoint.
 *
 * Cache Policy:
 * Formally non-cacheable via RequestCacheManager endpoint metadata ({ scope: "none", ttl: 0 }).
 * There is no need for external cache-busting URL hacks like `refresh=true` or `_t=Date.now()`.
 */
function getMeUrl(): string {
  return apiRoutes.auth.me;
}

/**
 * Maps a failed `/auth/me` to the right AuthState.
 *
 * The previous implementation collapsed every non-success into a single
 * "guest + error" state, which silently turned temporary backend outages
 * (5xx / network / timeout) into signed-out sessions and could trigger
 * redirect loops in `handleUnauthorized`.
 *
 * Now we preserve the four-way distinction:
 *   - 401                  → anonymous (genuine signed-out)
 *   - 5xx / network / etc. → unavailable (backend unreachable, keep session
 *                            until proven absent)
 */
function stateFromMeError(err: unknown): AuthState {
  const is401 = err instanceof ApiError && err.status === 401;
  if (is401) {
    // A 401 is the expected answer for a guest, not an error worth surfacing.
    return { ...ANONYMOUS_STATE };
  }
  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    status: "unavailable",
    error: "تعذر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.",
  };
}

// ─── AuthStatus → SessionPresence mapping ────────────────────────────────────

/**
 * Translates the canonical `AuthStatus` into the `SessionPresence` vocabulary
 * the redirect guard speaks. Kept here because the `AuthStatus` enum is
 * defined in this module; the mapping is the boundary between the two
 * types.
 *
 *   "loading"      → "loading"     (auth state has not converged)
 *   "authenticated"→ "present"     (we have positive proof of a session)
 *   "anonymous"    → "absent"      (401 confirmed: the user is signed out)
 *   "unavailable"  → "unavailable" (backend unreachable; keep prior signal)
 */
function mapAuthStatusToSessionPresence(status: AuthStatus): SessionPresence {
  switch (status) {
    case "authenticated":
      return "present";
    case "anonymous":
      return "absent";
    case "loading":
      return "loading";
    case "unavailable":
      return "unavailable";
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [authSessionVersion, setAuthSessionVersion] = useState(0);
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    status: "loading",
    error: null,
  });

  // Fetch current user exactly once on mount
  useEffect(() => {
    const controller = new AbortController();

    const fetchUser = async () => {
      try {
        const data = await apiClient.get<AuthMeResponse>(getMeUrl(), {
          signal: controller.signal,
        });

        // A 200 with no user object means the backend contract broke; treating
        // it as authenticated would leave `user` null behind an auth guard.
        if (!data?.user) {
          requestCache.setIdentity(null);
          setAuthSessionVersion((version) => version + 1);
          setState({ ...ANONYMOUS_STATE, error: "استجابة غير صالحة من الخادم" });
          return;
        }

        // Bind user-scoped cache entries to this identity (see request-cache.ts).
        // The identity itself is never cached in localStorage — the session is
        // the single source of identity.
        requestCache.setIdentity(data.user.id);
        setAuthSessionVersion((version) => version + 1);

        setState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
          status: "authenticated",
          error: null,
        });
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        // Only drop the identity binding on a confirmed 401. On a backend
        // outage ("unavailable") we keep the previous user-scoped cache
        // untouched — the session is presumed still valid and we must not
        // invalidate it just because /auth/me is temporarily unreachable.
        if (err instanceof ApiError && err.status === 401) {
          requestCache.setIdentity(null);
          setAuthSessionVersion((version) => version + 1);
        }
        setState(stateFromMeError(err));
      }
    };

    fetchUser();

    return () => {
      controller.abort();
    };
  }, []);

  // Report session presence to the API layer. The redirect guard now
  // accepts the full four-way status so it can keep the conservative
  // 'unknown' on transient failures instead of treating a 5xx as 'absent'
  // and risking a redirect loop. See redirect-loop-guard.ts.
  useEffect(() => {
    setSessionPresence(mapAuthStatusToSessionPresence(state.status));
  }, [state.status]);

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
    // Wipe every client-side cache that holds identity-dependent data so
    // the next visitor (or the same user re-authenticating as someone else)
    // never replays the previous session. See clear-client-caches.ts for
    // the rationale on the three layers (request-cache, React Query,
    // service worker) and the order in which they must be invalidated.
    await clearClientCaches({ queryClient });
    setAuthSessionVersion((version) => version + 1);
    setState(ANONYMOUS_STATE);
    window.location.href = "/login";
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    try {
      requestCache.clear();
      const data = await apiClient.get<AuthMeResponse>(getMeUrl());

      if (!data?.user) {
        requestCache.setIdentity(null);
        setAuthSessionVersion((version) => version + 1);
        setState({ ...ANONYMOUS_STATE, error: "استجابة غير صالحة من الخادم" });
        return false;
      }

      // Bind user-scoped cache entries to the (possibly new) identity — this
      // is what prevents the previous user's data from being replayed after
      // an in-session login switch (see request-cache.ts).
      requestCache.setIdentity(data.user.id);
      setAuthSessionVersion((version) => version + 1);

      setState({
        user: data.user,
        isLoading: false,
        isAuthenticated: true,
        status: "authenticated",
        error: null,
      });
      return true;
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        requestCache.setIdentity(null);
        setAuthSessionVersion((version) => version + 1);
      }
      setState(stateFromMeError(err));
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

      // Identity is about to change. Drop everything that could let a
      // concurrent request from the previous identity bleed into the
      // new session: in-flight dedup promises, the identity binding,
      // and the CSRF token. `refreshUser()` will re-establish them
      // under the new user.
      await clearClientCaches({ queryClient });

      // The session cookie is set; load the user so guards see the new role.
      const refreshed = await refreshUser();
      return refreshed
        ? { success: true }
        : { success: false, error: "تعذر تحميل بيانات المستخدم بعد تسجيل الدخول" };
    },
    [queryClient, refreshUser]
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

      // Same identity-transition cleanup as `adminLogin`: an MFA success
      // moves the user from a pre-auth (or partial-auth) state to a
      // fully-authenticated state, so any cached data from before must
      // be wiped to prevent it from being replayed under the new session.
      await clearClientCaches({ queryClient });

      const refreshed = await refreshUser();
      return refreshed
        ? { success: true }
        : { success: false, error: "تعذر تحميل بيانات المستخدم بعد التحقق" };
    },
    [queryClient, refreshUser]
  );

  // Memoized so consumers only re-render when auth state actually changes.
  // Without this, every AuthProvider render hands down a fresh object and
  // re-renders every `useAuth()` call site in the tree.
  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      authSessionVersion,
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
      authSessionVersion,
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
