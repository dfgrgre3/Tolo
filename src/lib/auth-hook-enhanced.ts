/**
 * ============================================
 * Hook محسّن للمصادقة (Client-Side)
 * ============================================
 * 
 * هذا هو Hook محسّن يوفر وظائف مصادقة إضافية (2FA، Social Login، إلخ)
 * يعمل كطبقة توافقية تعتمد على unified auth system
 * 
 * ⚠️ IMPORTANT - البنية الموحدة:
 * 
 * 📁 CLIENT-SIDE (العميل):
 *   ✅ src/contexts/auth-context.tsx → المصدر الأساسي الموثوق ⭐
 *      └─> useUnifiedAuth() (الاستخدام الأساسي)
 *   
 *   🔄 هذا الملف (طبقة توافق):
 *      - src/lib/auth-hook-enhanced.ts → useEnhancedAuth()
 *      └─> يعتمد على: useUnifiedAuth من @/contexts/auth-context
 * 
 * 📖 للاستخدام:
 *   ✅ للاستخدام الأساسي: 
 *      import { useUnifiedAuth } from '@/contexts/auth-context'
 *   
 *   ✅ للوظائف الإضافية (2FA، Social Login): 
 *      import { useEnhancedAuth } from '@/lib/auth-hook-enhanced'
 *   
 *   ✅ لدوال API: 
 *      import { loginUser, verifyTwoFactor } from '@/lib/api/auth-client'
 * 
 * 📚 راجع AUTH_STRUCTURE_UNIFIED.md للتفاصيل الكاملة
 */

'use client';

import { useUnifiedAuth, type User } from '@/contexts/auth-context';
import { verifyTwoFactor as verifyTwoFactorAPI } from '@/lib/api/auth-client';
import { loginUser } from '@/lib/api/auth-client';
import { authValidator } from '@/lib/auth/validation-interface';

export interface EnhancedAuthHook {
  user: User | null;
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) => Promise<{
    requiresTwoFactor?: boolean;
    loginAttemptId?: string;
    expiresAt?: string;
    methods?: string[];
    debugCode?: string;
    token?: string;
    user?: User;
    sessionId?: string;
  }>;
  verifyTwoFactor: (params: {
    loginAttemptId: string;
    code: string;
    trustDevice?: boolean;
  }) => Promise<{
    token: string;
    user: User;
    sessionId?: string;
  }>;
  resendTwoFactorCode: (params: {
    loginAttemptId: string;
    method?: 'email' | 'sms';
  }) => Promise<void>;
  loginWithSocial: (provider: 'google' | 'github' | 'twitter') => Promise<void>;
}

export function useEnhancedAuth(): EnhancedAuthHook {
  const { user, login: unifiedLogin } = useUnifiedAuth();

  const login = async (credentials: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }) => {
    // Enhanced input validation using centralized validation
    if (!credentials || typeof credentials !== 'object') {
      throw new Error('بيانات تسجيل الدخول مطلوبة');
    }

    // Validate email using centralized validation
    const emailValidation = authValidator.validateEmail(credentials.email);
    if (!emailValidation.isValid) {
      throw new Error(emailValidation.error || 'البريد الإلكتروني غير صحيح');
    }
    const normalizedEmail = emailValidation.normalized!;

    // Validate password using centralized validation
    const passwordValidation = authValidator.validatePassword(credentials.password);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.error || 'كلمة المرور غير صحيحة');
    }

    const response = await loginUser({
      email: normalizedEmail,
      password: credentials.password, // Don't trim password
      rememberMe: credentials.rememberMe ?? false,
    });

    // If 2FA is required, return the challenge info
    if (response.requiresTwoFactor) {
      return {
        requiresTwoFactor: true,
        loginAttemptId: response.loginAttemptId,
        expiresAt: response.expiresAt,
        methods: response.methods,
        debugCode: response.debugCode,
      };
    }

    // If login is successful, use unified login
    if (response.token && response.user) {
      await unifiedLogin(
        response.token,
        response.user as User,
        response.sessionId
      );
    }

    return {
      token: response.token,
      user: response.user as User,
      sessionId: response.sessionId,
    };
  };

  const verifyTwoFactor = async (params: {
    loginAttemptId: string;
    code: string;
    trustDevice?: boolean;
  }) => {
    // Enhanced input validation using centralized validation
    if (!params || typeof params !== 'object') {
      throw new Error('بيانات التحقق مطلوبة');
    }

    // Validate loginAttemptId using centralized validation
    const idValidation = authValidator.validateLoginAttemptId(params.loginAttemptId);
    if (!idValidation.isValid) {
      throw new Error(idValidation.error || 'معرف محاولة تسجيل الدخول غير صحيح');
    }
    const trimmedLoginAttemptId = idValidation.normalized!;

    // Validate code using centralized validation
    const codeValidation = authValidator.validateTwoFactorCode(params.code);
    if (!codeValidation.isValid) {
      throw new Error(codeValidation.error || 'رمز التحقق غير صحيح');
    }
    const trimmedCode = codeValidation.normalized!;

    const response = await verifyTwoFactorAPI({
      loginAttemptId: trimmedLoginAttemptId,
      code: trimmedCode,
      trustDevice: params.trustDevice ?? false,
    });

    // Use unified login after successful 2FA verification
    if (response.token && response.user) {
      await unifiedLogin(
        response.token,
        response.user as User,
        response.sessionId
      );
    }

    return {
      token: response.token,
      user: response.user as User,
      sessionId: response.sessionId,
    };
  };

  const resendTwoFactorCode = async (params: {
    loginAttemptId: string;
    method?: 'email' | 'sms';
  }) => {
    // Enhanced input validation using centralized validation
    if (!params || typeof params !== 'object') {
      throw new Error('بيانات إعادة الإرسال مطلوبة');
    }

    // Validate loginAttemptId using centralized validation
    const idValidation = authValidator.validateLoginAttemptId(params.loginAttemptId);
    if (!idValidation.isValid) {
      throw new Error(idValidation.error || 'معرف محاولة تسجيل الدخول غير صحيح');
    }
    const trimmedLoginAttemptId = idValidation.normalized!;

    // Validate method
    if (params.method && params.method !== 'email' && params.method !== 'sms') {
      throw new Error('طريقة الإرسال غير صحيحة');
    }

    try {
      // Add timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('/api/auth/resend-two-factor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginAttemptId: trimmedLoginAttemptId,
          method: params.method || 'email',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'فشل إعادة إرسال رمز التحقق' }));
        throw new Error(error.error || 'فشل إعادة إرسال رمز التحقق');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.');
      }
      throw error;
    }
  };

  const loginWithSocial = async (provider: 'google' | 'github' | 'twitter') => {
    // Redirect to social login endpoint
    window.location.href = `/api/auth/${provider}?redirect=${encodeURIComponent(window.location.pathname)}`;
  };

  return {
    user,
    login,
    verifyTwoFactor,
    resendTwoFactorCode,
    loginWithSocial,
  };
}
