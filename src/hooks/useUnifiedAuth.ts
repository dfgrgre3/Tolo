/**
 * ============================================
 * ⚠️ DEPRECATED - استخدم @/contexts/auth-context بدلاً من ذلك
 * ============================================
 * 
 * هذا الملف موجود للتوافق مع الكود القديم فقط
 * 
 * ✅ للاستخدام الجديد (موصى به):
 *   import { useUnifiedAuth } from '@/contexts/auth-context'
 * 
 * ✅ للوظائف المتقدمة (2FA، Social Login):
 *   import { useEnhancedAuth } from '@/lib/auth-hook-enhanced'
 * 
 * ⚠️ هذا الملف يستورد مباشرة من unified-auth-manager
 *    يجب تجنب الاستيراد المباشر من الملفات الداخلية
 * 
 * Unified Authentication Hook
 * Hook موحد لاستخدام المصادقة في جميع المكونات
 * 
 * يوفر:
 * - واجهة موحدة لجميع عمليات المصادقة
 * - مزامنة تلقائية مع الخادم
 * - استعادة تلقائية من الأخطاء
 * - دعم الوضع غير المتصل
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
// ⚠️ DEPRECATED: يجب استخدام useUnifiedAuth من @/contexts/auth-context بدلاً من ذلك
import { getAuthManager, type AuthState, type AuthEvent } from '@/lib/auth/unified-auth-manager';
import { loginUser, verifyTwoFactor } from '@/lib/api/auth-client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface UseUnifiedAuthOptions {
  /**
   * إعادة توجيه تلقائية عند تسجيل الخروج
   */
  autoRedirect?: boolean;
  
  /**
   * مسار إعادة التوجيه عند تسجيل الخروج
   */
  redirectTo?: string;
  
  /**
   * التحقق التلقائي من المصادقة عند التحميل
   */
  autoCheck?: boolean;
  
  /**
   * مراقبة التغييرات في الحالة
   */
  onStateChange?: (state: AuthState) => void;
  
  /**
   * معالجة انتهاء الجلسة
   */
  onSessionExpired?: () => void;
}

export interface UseUnifiedAuthReturn {
  // الحالة
  user: AuthState['user'];
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionId: string | null;
  
  // العمليات
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginWithTwoFactor: (loginAttemptId: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<any>) => void;
  checkAuth: () => Promise<boolean>;
  
  // معلومات إضافية
  lastActivity: number;
  isOnline: boolean;
}

export function useUnifiedAuth(options: UseUnifiedAuthOptions = {}): UseUnifiedAuthReturn {
  const {
    autoRedirect = true,
    redirectTo = '/login',
    autoCheck = true,
    onStateChange,
    onSessionExpired,
  } = options;

  const router = useRouter();
  const authManager = getAuthManager();
  
  const [state, setState] = useState<AuthState>(() => authManager.getState());
  const [isOnline, setIsOnline] = useState(() => 
    typeof window !== 'undefined' ? navigator.onLine : true
  );

  // مراقبة الحالة
  useEffect(() => {
    const handleStateChange = (event: { state: AuthState }) => {
      setState(event.state);
      onStateChange?.(event.state);
    };

    const handleSessionExpired = () => {
      if (autoRedirect) {
        router.push(redirectTo);
      }
      onSessionExpired?.();
      toast.error('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.');
    };

    const handleConnectionRestored = () => {
      setIsOnline(true);
      // مزامنة مع الخادم عند استعادة الاتصال (non-blocking)
      authManager.syncWithServer().catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          logger.debug('Sync with server failed (non-critical):', error);
        }
      });
    };

    const handleConnectionLost = () => {
      setIsOnline(false);
      toast.warning('تم فقدان الاتصال بالإنترنت', { duration: 3000 });
    };

    authManager.on('state_change', handleStateChange);
    authManager.on('session_expired', handleSessionExpired);
    authManager.on('connection_restored', handleConnectionRestored);
    authManager.on('connection_lost', handleConnectionLost);

    return () => {
      authManager.off('state_change', handleStateChange);
      authManager.off('session_expired', handleSessionExpired);
      authManager.off('connection_restored', handleConnectionRestored);
      authManager.off('connection_lost', handleConnectionLost);
    };
  }, [authManager, autoRedirect, redirectTo, router, onStateChange, onSessionExpired]);

  // التحقق التلقائي من المصادقة
  useEffect(() => {
    if (autoCheck && !state.isLoading) {
      // Add timeout to prevent hanging
      const checkAuthPromise = authManager.checkAuth();
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 5000); // 5 second timeout
      });

      Promise.race([checkAuthPromise, timeoutPromise]).catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          logger.debug('Auto auth check failed (non-critical):', error);
        }
      });
    }
  }, [autoCheck, authManager, state.isLoading]);

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

  // تسجيل الدخول
  // يضمن التكامل الكامل مع الخادم
  // التوكن يتم حفظه في httpOnly cookie من الخادم
  // محسّن مع معالجة أفضل للأخطاء والتحقق والأمان
  // 
  // Security improvements:
  // - Comprehensive input validation and sanitization
  // - Timeout protection for API calls
  // - Better error handling and user feedback
  // - Response validation
  const login = useCallback(async (
    email: string,
    password: string,
    rememberMe: boolean = false
  ) => {
    const startTime = Date.now();
    
    // Enhanced input validation with comprehensive checks
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      const errorMsg = 'البريد الإلكتروني مطلوب';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Validate email length (RFC 5321 limit)
    if (email.length > 254) {
      const errorMsg = 'البريد الإلكتروني طويل جداً';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      const errorMsg = 'كلمة المرور مطلوبة';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Validate password length (security best practice)
    if (password.length < 8) {
      const errorMsg = 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (password.length > 128) {
      const errorMsg = 'كلمة المرور طويلة جداً';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Normalize and validate email format
    const normalizedEmail = email.trim().toLowerCase();
    
    // Enhanced email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      const errorMsg = 'صيغة البريد الإلكتروني غير صحيحة';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Additional security: Check for potentially malicious email patterns
    if (normalizedEmail.includes('..') || normalizedEmail.startsWith('.') || normalizedEmail.endsWith('.')) {
      const errorMsg = 'صيغة البريد الإلكتروني غير صحيحة';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      // استدعاء API تسجيل الدخول مع timeout protection
      const loginPromise = loginUser({
        email: normalizedEmail,
        password,
        rememberMe: Boolean(rememberMe),
      });

      const timeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => {
          reject({
            error: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.',
            code: 'REQUEST_TIMEOUT',
          });
        }, 30000); // 30 second timeout
      });

      const data = await Promise.race([loginPromise, timeoutPromise]);

      if (data.requiresTwoFactor) {
        // يتطلب التحقق بخطوتين
        if (!data.loginAttemptId) {
          throw new Error('معرف محاولة تسجيل الدخول غير موجود');
        }
        throw {
          requiresTwoFactor: true,
          loginAttemptId: data.loginAttemptId,
          expiresAt: data.expiresAt,
          methods: data.methods,
        };
      }

      // التحقق من صحة الاستجابة
      if (!data || typeof data !== 'object') {
        throw new Error('استجابة غير صحيحة من الخادم');
      }

      if (!data.token || typeof data.token !== 'string' || data.token.trim().length === 0) {
        throw new Error('رمز المصادقة غير موجود في الاستجابة');
      }

      if (!data.user || typeof data.user !== 'object') {
        throw new Error('بيانات المستخدم غير موجودة في الاستجابة');
      }

      // تحديث حالة المصادقة
      // التوكن موجود في httpOnly cookie - لا حاجة لحفظه محلياً
      await authManager.login(data.token.trim(), data.user, data.sessionId || undefined);
      
      // Log successful login duration for monitoring
      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`useUnifiedAuth.login completed successfully in ${duration}ms`);
      }
      
      toast.success('تم تسجيل الدخول بنجاح!');
    } catch (error: any) {
      if (error && error.requiresTwoFactor) {
        throw error; // إعادة رمي للتعامل معه في المكون
      }
      
      // Log error with context
      logger.error('Login error:', {
        error: error?.error || error?.message || String(error),
        code: error?.code,
        duration: Date.now() - startTime,
      });
      
      const errorMessage = error?.error || error?.message || 'فشل تسجيل الدخول';
      toast.error(errorMessage);
      throw error;
    }
  }, [authManager]);

  // تسجيل الدخول بخطوتين
  // يضمن التكامل الكامل مع الخادم
  // التوكن يتم حفظه في httpOnly cookie من الخادم
  // محسّن مع معالجة أفضل للأخطاء والتحقق
  // 
  // Security improvements:
  // - Comprehensive input validation
  // - Timeout protection for API calls
  // - Better error handling
  const loginWithTwoFactor = useCallback(async (
    loginAttemptId: string,
    code: string
  ) => {
    const startTime = Date.now();
    
    // Validate inputs early
    if (!loginAttemptId || typeof loginAttemptId !== 'string' || loginAttemptId.trim().length === 0) {
      const errorMsg = 'معرف محاولة تسجيل الدخول مطلوب';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      const errorMsg = 'رمز التحقق مطلوب';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Validate code format (should be 6 digits)
    const codeRegex = /^\d{6}$/;
    if (!codeRegex.test(code.trim())) {
      const errorMsg = 'رمز التحقق يجب أن يكون مكون من 6 أرقام';
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Sanitize inputs
    const sanitizedLoginAttemptId = loginAttemptId.trim();
    const sanitizedCode = code.trim();

    try {
      // التحقق من رمز المصادقة بخطوتين مع timeout protection
      const verifyPromise = verifyTwoFactor({
        loginAttemptId: sanitizedLoginAttemptId,
        code: sanitizedCode,
      });

      const timeoutPromise = new Promise<never>((resolve, reject) => {
        setTimeout(() => {
          reject({
            error: 'انتهت مهلة التحقق. يرجى المحاولة مرة أخرى.',
            code: 'VERIFICATION_TIMEOUT',
          });
        }, 30000); // 30 second timeout
      });

      const data = await Promise.race([verifyPromise, timeoutPromise]);

      // التحقق من صحة الاستجابة
      if (!data || typeof data !== 'object') {
        throw new Error('استجابة غير صحيحة من الخادم');
      }

      if (!data.token || typeof data.token !== 'string' || data.token.trim().length === 0) {
        throw new Error('رمز المصادقة غير موجود في الاستجابة');
      }

      if (!data.user || typeof data.user !== 'object') {
        throw new Error('بيانات المستخدم غير موجودة في الاستجابة');
      }

      // تحديث حالة المصادقة
      // التوكن موجود في httpOnly cookie - لا حاجة لحفظه محلياً
      await authManager.login(data.token.trim(), data.user, data.sessionId || undefined);
      
      // Log successful 2FA login duration for monitoring
      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`useUnifiedAuth.loginWithTwoFactor completed successfully in ${duration}ms`);
      }
      
      toast.success('تم تسجيل الدخول بنجاح!');
    } catch (error: any) {
      // Log error with context
      logger.error('2FA login error:', {
        error: error?.error || error?.message || String(error),
        code: error?.code,
        duration: Date.now() - startTime,
      });
      
      const errorMessage = error?.error || error?.message || 'فشل التحقق بخطوتين';
      toast.error(errorMessage);
      throw error;
    }
  }, [authManager]);

  // تسجيل الخروج
  const logout = useCallback(async () => {
    try {
      await authManager.logout();
      toast.success('تم تسجيل الخروج بنجاح');
      
      if (autoRedirect) {
        router.push(redirectTo);
      }
    } catch (error) {
      logger.error('Logout error:', error);
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    }
  }, [authManager, autoRedirect, redirectTo, router]);

  // تحديث بيانات المستخدم
  const updateUser = useCallback((userData: Partial<any>) => {
    authManager.updateUser(userData);
  }, [authManager]);

  // تحديث بيانات المستخدم من الخادم
  const refreshUser = useCallback(async () => {
    try {
      // Add timeout to prevent hanging
      const syncPromise = authManager.syncWithServer();
      const timeoutPromise = new Promise<void>((resolve, reject) => {
        setTimeout(() => reject(new Error('Sync timeout')), 10000); // 10 second timeout
      });

      await Promise.race([syncPromise, timeoutPromise]);
    } catch (error) {
      // Only log in development to avoid noise
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Refresh user error (non-critical):', error);
      }
      // Don't throw - allow component to continue with cached data
    }
  }, [authManager]);

  // التحقق من حالة المصادقة
  const checkAuth = useCallback(async () => {
    return await authManager.checkAuth();
  }, [authManager]);

  return useMemo(() => ({
    // الحالة
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    sessionId: state.sessionId,
    lastActivity: state.lastActivity,
    isOnline,
    
    // العمليات
    login,
    loginWithTwoFactor,
    logout,
    refreshUser,
    updateUser,
    checkAuth,
  }), [
    state,
    isOnline,
    login,
    loginWithTwoFactor,
    logout,
    refreshUser,
    updateUser,
    checkAuth,
  ]);
}

export default useUnifiedAuth;

