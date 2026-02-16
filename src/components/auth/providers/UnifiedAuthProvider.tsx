/**
 * ============================================
 * Provider موحد ومتكامل للمصادقة (Client-Side)
 * ============================================
 * 
 * ⚠️ IMPORTANT: لا تستورد من هذا الملف مباشرة
 * ✅ استخدم @/contexts/auth-context كالمصدر الوحيد الموثوق
 * 
 * ⚠️ IMPORTANT - البنية الموحدة:
 * 
 * 📁 CLIENT-SIDE (العميل):
 *   ✅ src/contexts/auth-context.tsx → نقطة التصدير الموحدة ⭐
 *      └─> UnifiedAuthProvider, useUnifiedAuth
 *          └─> هذا الملف (التنفيذ)
 *              └─> src/lib/auth/unified-auth-manager.ts (إدارة الحالة)
 * 
 * 📖 للاستخدام:
 *   ✅ في Client Components: 
 *      import { useUnifiedAuth } from '@/contexts/auth-context'
 *   
 *   ✅ في Providers: 
 *      import { UnifiedAuthProvider } from '@/contexts/auth-context'
 * 
 * 📚 راجع AUTH_STRUCTURE_UNIFIED.md للتفاصيل الكاملة
 */

'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthManager, type AuthState } from '@/lib/auth/unified-auth-manager';
import { getSessionSyncManager } from '@/lib/auth/session-sync';
import { getErrorRecoveryManager } from '@/lib/auth/error-recovery';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { loginUser, verifyTwoFactor as verifyTwoFactorApi, resendTwoFactorCode as resendTwoFactorApi } from '@/lib/api/auth-client';
import type { LoginResponse } from '@/types/api/auth';

/**
 * Response when two-factor authentication is required
 */
export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true;
  loginAttemptId: string;
  method?: 'totp' | 'sms' | 'email';
  methods?: string[];
  expiresAt?: string;
}

import { type User } from '@/types/api/auth';

export interface UnifiedAuthContextType {
  // الحالة
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionId: string | null;
  isOnline: boolean;
  lastActivity: number;

  // العمليات الأساسية
  login: (token: string, userData?: User, sessionId?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  checkAuth: () => Promise<boolean>;

  // عمليات تسجيل الدخول المتقدمة
  loginWithCredentials: (
    email: string, 
    password: string, 
    rememberMe?: boolean,
    options?: { captchaToken?: string; deviceFingerprint?: string }
  ) => Promise<LoginResponse | TwoFactorRequiredResponse>;
  loginWithTwoFactor: (loginAttemptId: string, code: string) => Promise<void>;
  resendTwoFactorCode: (loginAttemptId: string, method?: 'email' | 'sms') => Promise<void>;
  loginWithSocial: (provider: 'google' | 'github' | 'twitter') => Promise<void>;

  // معلومات إضافية
  error: Error | null;
  retryAuth: () => Promise<void>;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

export { UnifiedAuthContext };

export function UnifiedAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const authManager = getAuthManager();
  const sessionSync = getSessionSyncManager();
  const recoveryManager = getErrorRecoveryManager();

  const [state, setState] = useState<AuthState>(() => authManager.getState());
  const [isOnline, setIsOnline] = useState(() => 
    typeof window !== 'undefined' ? navigator.onLine : true
  );
  const [error, setError] = useState<Error | null>(null);

  // مراقبة الحالة
  useEffect(() => {
    const handleStateChange = (event: { state: AuthState }) => {
      setState(event.state);
      setError(null); // مسح الأخطاء عند تغيير الحالة
    };

    const handleLogin = () => {
      toast.success('تم تسجيل الدخول بنجاح!');
    };

    const handleLogout = () => {
      toast.success('تم تسجيل الخروج بنجاح');
      router.push('/login');
    };

    const handleSessionExpired = () => {
      toast.error('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
      router.push('/login');
    };

    const handleError = (event: { type: string; error: unknown }) => {
      logger.error('Auth error:', event);
      setError(event.error instanceof Error ? event.error : new Error(String(event.error)));
    };

    const handleConnectionRestored = () => {
      setIsOnline(true);
      toast.success('تم استعادة الاتصال', { duration: 2000 });
      // مزامنة مع الخادم
      authManager.syncWithServer().catch((err: unknown) => {
        logger.error('Sync after connection restore failed:', err);
      });
    };

    const handleConnectionLost = () => {
      setIsOnline(false);
      toast.warning('تم فقدان الاتصال بالإنترنت', { duration: 3000 });
    };

    // الاستماع للأحداث
    authManager.on('state_change', handleStateChange);
    authManager.on('login', handleLogin);
    authManager.on('logout', handleLogout);
    authManager.on('session_expired', handleSessionExpired);
    authManager.on('error', handleError);
    authManager.on('connection_restored', handleConnectionRestored);
    authManager.on('connection_lost', handleConnectionLost);

    // الاستماع لأحداث Session Sync
    sessionSync.on('login', (data) => {
      if (data?.user) {
        toast.info('تم تسجيل الدخول من تبويب آخر', { duration: 3000 });
      }
    });

    sessionSync.on('logout', () => {
      toast.info('تم تسجيل الخروج من تبويب آخر', { duration: 3000 });
    });

    return () => {
      authManager.off('state_change', handleStateChange);
      authManager.off('login', handleLogin);
      authManager.off('logout', handleLogout);
      authManager.off('session_expired', handleSessionExpired);
      authManager.off('error', handleError);
      authManager.off('connection_restored', handleConnectionRestored);
      authManager.off('connection_lost', handleConnectionLost);
    };
  }, [authManager, sessionSync, router]);

  // مراقبة حالة الاتصال
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // التحقق التلقائي من المصادقة عند التحميل
  useEffect(() => {
    if (!state.isLoading && !state.isAuthenticated) {
      authManager.checkAuth().catch((err: unknown) => {
        logger.error('Auto auth check failed:', err);
      });
    }
  }, [authManager, state.isLoading, state.isAuthenticated]);

  // تسجيل الدخول مع تحقق شامل
  const login = useCallback(async (token: string, userData?: User, sessionId?: string) => {
    try {
      setError(null);
      
      // Enhanced validation before login
      // Enhanced validation
      // Allow empty token if using cookie-based auth
      if ((!token || typeof token !== 'string' || token.trim().length === 0) && !userData) {
         const error = new Error('بيانات المصادقة مطلوبة');
         setError(error);
         throw error;
      }

      // Validate token format only if provided
      if (token && typeof token === 'string' && token.trim().length > 0) {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3 || tokenParts.some(part => part.length === 0)) {
           // Only warn for now, don't block login if we have user data (might be cookie auth)
           logger.warn('Invalid token format provided to login');
        }
      }

      // Validate user data if provided
      if (userData !== undefined) {
        if (!userData || typeof userData !== 'object' || Array.isArray(userData)) {
          const error = new Error('بيانات المستخدم غير صحيحة');
          setError(error);
          throw error;
        }

        if (!userData.id || typeof userData.id !== 'string' || userData.id.trim().length === 0) {
          const error = new Error('معرف المستخدم مطلوب');
          setError(error);
          throw error;
        }

        if (!userData.email || typeof userData.email !== 'string' || userData.email.trim().length === 0) {
          const error = new Error('بريد المستخدم مطلوب');
          setError(error);
          throw error;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const normalizedEmail = userData.email.trim().toLowerCase();
        if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 254) {
          const error = new Error('بريد المستخدم غير صحيح');
          setError(error);
          throw error;
        }
      }

      // Validate session ID if provided
      if (sessionId !== undefined) {
        if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
          logger.warn('Invalid session ID format provided to login');
          sessionId = undefined;
        }
      }

      const userToLogin: User = userData ?? {
        id: '', // Will be populated by server sync
        email: '',
        role: 'user',
        emailVerified: false,
        twoFactorEnabled: false,
      };
      await authManager.login(token, userToLogin, sessionId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, [authManager]);

  // تسجيل الدخول باستخدام البريد وكلمة المرور
  const loginWithCredentials = useCallback(async (
    email: string, 
    password: string, 
    rememberMe: boolean = false,
    options?: {
      captchaToken?: string;
      deviceFingerprint?: string;
    }
  ) => {
    try {
      setError(null);
      const response = await loginUser({ 
        email, 
        password, 
        rememberMe,
        captchaToken: options?.captchaToken,
        deviceFingerprint: options?.deviceFingerprint ? (typeof options.deviceFingerprint === 'string' 
          ? { fingerprint: options.deviceFingerprint } 
          : options.deviceFingerprint) : undefined
      });
      
      if (response.requiresTwoFactor && response.loginAttemptId) {
        return {
          requiresTwoFactor: true,
          loginAttemptId: response.loginAttemptId,
          method: response.method as 'totp' | 'sms' | 'email' | undefined,
          methods: response.methods,
          expiresAt: response.expiresAt,
        } as TwoFactorRequiredResponse;
      }

      if (response.user) {
        const user: User = {
          id: response.user.id,
          email: response.user.email,
          name: response.user.name || undefined,
          emailVerified: response.user.emailVerified ?? false,
          provider: response.user.provider || 'local',
          twoFactorEnabled: response.user.twoFactorEnabled ?? false,
          lastLogin: response.user.lastLogin ? new Date(response.user.lastLogin).toISOString() : undefined,
          role: response.user.role ?? 'user',
          avatar: response.user.avatar || null,
          // Gamification
          level: response.user.level,
          xp: response.user.xp,
          xpToNextLevel: response.user.xpToNextLevel,
          rank: response.user.rank,
          badges: response.user.badges,
          bio: response.user.bio,
        };
        await login(response.token || '', user, response.sessionId);
        
        return {
          token: response.token,
          user,
          sessionId: response.sessionId,
          requiresTwoFactor: false,
          loginAttemptId: undefined,
        } as LoginResponse;
      }
      
      throw new Error(response.message || 'فشل تسجيل الدخول');
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, [login]);

  // تسجيل الدخول باستخدام التحقق بخطوتين
  const loginWithTwoFactor = useCallback(async (loginAttemptId: string, code: string) => {
    try {
      setError(null);
      const response = await verifyTwoFactorApi({ loginAttemptId, code });
      
      if (response.user) {
        const user: User = {
          id: response.user.id,
          email: response.user.email,
          name: response.user.name || undefined,
          emailVerified: response.user.emailVerified ?? false,
          provider: response.user.provider || 'local',
          twoFactorEnabled: response.user.twoFactorEnabled ?? false,
          lastLogin: response.user.lastLogin ? new Date(response.user.lastLogin).toISOString() : undefined,
          role: response.user.role ?? 'user',
          avatar: response.user.avatar || null,
          // Gamification
          level: response.user.level,
          xp: response.user.xp,
          xpToNextLevel: response.user.xpToNextLevel,
          rank: response.user.rank,
          badges: response.user.badges,
          bio: response.user.bio,
        };
        await login(response.token || '', user, response.sessionId);
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, [login]);

  // إعادة إرسال رمز التحقق
  const resendTwoFactorCode = useCallback(async (loginAttemptId: string, method?: 'email' | 'sms') => {
    try {
      setError(null);
      await resendTwoFactorApi({ loginAttemptId, method });
      toast.success('تم إعادة إرسال رمز التحقق بنجاح');
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, []);

  // تسجيل الدخول باستخدام وسائل التواصل الاجتماعي
  const loginWithSocial = useCallback(async (provider: 'google' | 'github' | 'twitter') => {
    try {
      window.location.href = `/api/auth/${provider}?redirect=${encodeURIComponent(window.location.pathname)}`;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, []);

  // تسجيل الخروج
  const logout = useCallback(async () => {
    try {
      setError(null);
      await authManager.logout();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, [authManager]);

  // تحديث بيانات المستخدم
  const updateUser = useCallback((userData: Partial<User>) => {
    authManager.updateUser(userData);
  }, [authManager]);

  // تحديث بيانات المستخدم من الخادم
  const refreshUser = useCallback(async () => {
    try {
      setError(null);
      await authManager.syncWithServer();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, [authManager]);

  // التحقق من حالة المصادقة
  const checkAuth = useCallback(async () => {
    try {
      setError(null);
      return await authManager.checkAuth();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return false;
    }
  }, [authManager]);

  // إعادة المحاولة
  const retryAuth = useCallback(async () => {
    try {
      setError(null);
      await recoveryManager.retryWithBackoff(
        () => authManager.checkAuth(),
        { maxRetries: 3, retryDelay: 1000 }
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, [authManager, recoveryManager]);

  const contextValue = useMemo(() => ({
    // الحالة
    user: state.user as User | null,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    sessionId: state.sessionId,
    isOnline,
    lastActivity: state.lastActivity,
    error,

    // العمليات
    login,
    loginWithCredentials,
    loginWithTwoFactor,
    resendTwoFactorCode,
    loginWithSocial,
    logout,
    updateUser,
    refreshUser,
    checkAuth,
    retryAuth,
  }), [
    state,
    isOnline,
    error,
    login,
    loginWithCredentials,
    loginWithTwoFactor,
    resendTwoFactorCode,
    loginWithSocial,
    logout,
    updateUser,
    refreshUser,
    checkAuth,
    retryAuth,
  ]);

  return (
    <UnifiedAuthContext.Provider value={contextValue}>
      {children}
    </UnifiedAuthContext.Provider>
  );
}

export function useUnifiedAuth() {
  const context = useContext(UnifiedAuthContext);
  if (context === undefined) {
    throw new Error('useUnifiedAuth must be used within a UnifiedAuthProvider');
  }
  return context;
}

export default UnifiedAuthProvider;
