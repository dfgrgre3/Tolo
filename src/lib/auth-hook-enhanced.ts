'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginOutcome {
  requiresTwoFactor?: boolean;
  loginAttemptId?: string;
  expiresAt?: string;
  methods?: string[];
  debugCode?: string;
  user?: User;
  token?: string;
  refreshToken?: string;
  sessionId?: string;
}

interface VerifyTwoFactorPayload {
  loginAttemptId: string;
  code: string;
  trustDevice?: boolean;
}

interface ResendTwoFactorPayload {
  loginAttemptId: string;
  method: 'email' | 'sms';
}

interface AuthHookResult {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginPayload) => Promise<LoginOutcome>;
  verifyTwoFactor: (payload: VerifyTwoFactorPayload) => Promise<User>;
  resendTwoFactorCode: (payload: ResendTwoFactorPayload) => Promise<void>;
  loginWithSocial: (provider: 'google' | 'github' | 'twitter') => Promise<void>;
}

interface AuthError extends Error {
  status?: number;
  code?: string;
  details?: Record<string, string[]>;
}

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const SESSION_ID_KEY = 'session_id';
const GENERIC_ERROR_MESSAGE = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';

type StoragePreference = 'local' | 'session';

let lastPreferredStorage: StoragePreference = 'local';

const createAuthError = (
  response: Response,
  data: any,
  fallbackMessage: string = GENERIC_ERROR_MESSAGE,
): AuthError => {
  const errorMessage =
    (typeof data?.error === 'string' && data.error.trim().length > 0
      ? data.error
      : undefined) || fallbackMessage;

  const error: AuthError = new Error(errorMessage);
  error.status = response.status;

  if (typeof data?.code === 'string') {
    error.code = data.code;
  }

  if (data?.details && typeof data.details === 'object') {
    error.details = data.details;
  }

  return error;
};

const persistSession = (data: {
  token?: string;
  refreshToken?: string;
  sessionId?: string;
}, options: { rememberMe?: boolean } = {}) => {
  if (typeof window === 'undefined') {
    return;
  }

  const useLocalStorage =
    options.rememberMe ?? lastPreferredStorage === 'local';

  lastPreferredStorage = useLocalStorage ? 'local' : 'session';

  const primaryStorage = useLocalStorage
    ? window.localStorage
    : window.sessionStorage;
  const secondaryStorage = useLocalStorage
    ? window.sessionStorage
    : window.localStorage;

  if (data.token) {
    primaryStorage.setItem(ACCESS_TOKEN_KEY, data.token);
    secondaryStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  if (data.refreshToken) {
    primaryStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    secondaryStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  if (data.sessionId) {
    primaryStorage.setItem(SESSION_ID_KEY, data.sessionId);
    secondaryStorage.removeItem(SESSION_ID_KEY);
  }
};

const getStoredAccessToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const localToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  if (localToken) {
    lastPreferredStorage = 'local';
    return localToken;
  }

  const sessionToken = window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (sessionToken) {
    lastPreferredStorage = 'session';
    return sessionToken;
  }

  return null;
};

export function useEnhancedAuth(): AuthHookResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const headers: HeadersInit = {};
        const storedToken = getStoredAccessToken();
        if (storedToken) {
          headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const response = await fetch('/api/auth/me', {
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        const payload = await response.json();

        if (!cancelled) {
          setUser(payload.user);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials: LoginPayload) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      const data: any = await response
        .json()
        .catch(() => ({} as Record<string, unknown>));

      if (!response.ok) {
        throw createAuthError(
          response,
          data,
          '???? ????? ??????. ???? ???????? ??? ????.',
        );
      }

      if (data.requiresTwoFactor) {
        return {
          requiresTwoFactor: true,
          loginAttemptId: data.loginAttemptId,
          expiresAt: data.expiresAt,
          methods: data.methods,
          debugCode: data.debugCode,
        };
      }

      const authenticatedUser: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
      };

      persistSession({
        token: data.token,
        refreshToken: data.refreshToken,
        sessionId: data.sessionId,
      });
      setUser(authenticatedUser);

      return {
        user: authenticatedUser,
        token: data.token,
        refreshToken: data.refreshToken,
        sessionId: data.sessionId,
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyTwoFactor = useCallback(async (payload: VerifyTwoFactorPayload) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/two-factor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data: any = await response
        .json()
        .catch(() => ({} as Record<string, unknown>));

      if (!response.ok) {
        throw createAuthError(
          response,
          data,
          '???? ?????? ?? ?????. ???? ???????? ??? ????.',
        );
      }

      const authenticatedUser: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
      };

      persistSession({
        token: data.token,
        refreshToken: data.refreshToken,
        sessionId: data.sessionId,
      });
      setUser(authenticatedUser);

      return authenticatedUser;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resendTwoFactorCode = useCallback(
    async (payload: ResendTwoFactorPayload) => {
      const response = await fetch('/api/auth/two-factor/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return;
      }

      const data: any = await response
        .json()
        .catch(() => ({} as Record<string, unknown>));
      throw createAuthError(
        response,
        data,
        '???? ????? ????? ?????. ???? ???????? ??? ????.',
      );
    },
    [],
  );

  const loginWithSocial = useCallback(
    async (provider: 'google' | 'github' | 'twitter') => {
      setLoading(true);
      setError(null);

      try {
        window.location.href = `/api/auth/${provider}`;
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },
    [],
  );

  return {
    user,
    loading,
    error,
    login,
    verifyTwoFactor,
    resendTwoFactorCode,
    loginWithSocial,
  };
}
