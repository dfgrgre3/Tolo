/**
 * Enhanced Auth Hook
 * Hook محسّن للمصادقة
 * 
 * هذا هو Hook محسّن يوفر وظائف مصادقة محسّنة للمكونات.
 * يعمل كطبقة توافقية تعتمد على unified auth system.
 * 
 * للاستخدام:
 * - في Client Components: استورد useEnhancedAuth من هذا الملف
 * - يوفر: login, verifyTwoFactor, resendTwoFactorCode, loginWithSocial
 * 
 * الملفات المتعلقة:
 * - src/contexts/auth-context.tsx: يوفر useUnifiedAuth (المصدر الأساسي)
 * - src/lib/api/auth-client.ts: يوفر دوال API (loginUser, verifyTwoFactor, etc.)
 * - src/lib/auth-service.ts: الخدمة الأساسية على الخادم (server-side)
 * 
 * ⚠️ لا تستورد دوال API مباشرة من هذا الملف - استخدم @/lib/api/auth-client
 */

'use client';

import { useUnifiedAuth } from '@/contexts/auth-context';
import { verifyTwoFactor as verifyTwoFactorAPI } from '@/lib/api/auth-client';
import { loginUser } from '@/lib/api/auth-client';
import type { User } from '@/components/auth/UnifiedAuthProvider';

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
    // Enhanced input validation
    if (!credentials || typeof credentials !== 'object') {
      throw new Error('بيانات تسجيل الدخول مطلوبة');
    }

    if (!credentials.email || typeof credentials.email !== 'string' || credentials.email.trim().length === 0) {
      throw new Error('البريد الإلكتروني مطلوب');
    }

    // Validate email length (RFC 5321 limit)
    if (credentials.email.length > 254) {
      throw new Error('البريد الإلكتروني طويل جداً');
    }

    // Validate email format
    const normalizedEmail = credentials.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new Error('صيغة البريد الإلكتروني غير صحيحة');
    }
    
    // Additional security: Check for potentially malicious email patterns
    if (normalizedEmail.includes('..') || normalizedEmail.startsWith('.') || normalizedEmail.endsWith('.')) {
      throw new Error('صيغة البريد الإلكتروني غير صحيحة');
    }

    if (!credentials.password || typeof credentials.password !== 'string' || credentials.password.length === 0) {
      throw new Error('كلمة المرور مطلوبة');
    }

    // Validate password length (security best practice)
    if (credentials.password.length < 8) {
      throw new Error('كلمة المرور يجب أن تتكون من 8 أحرف على الأقل');
    }

    if (credentials.password.length > 128) {
      throw new Error('كلمة المرور طويلة جداً');
    }

    try {
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
    } catch (error: any) {
      throw error;
    }
  };

  const verifyTwoFactor = async (params: {
    loginAttemptId: string;
    code: string;
    trustDevice?: boolean;
  }) => {
    // Enhanced input validation
    if (!params || typeof params !== 'object') {
      throw new Error('بيانات التحقق مطلوبة');
    }

    if (!params.loginAttemptId || typeof params.loginAttemptId !== 'string' || params.loginAttemptId.trim().length === 0) {
      throw new Error('معرف محاولة تسجيل الدخول مطلوب');
    }

    if (!params.code || typeof params.code !== 'string' || params.code.trim().length === 0) {
      throw new Error('رمز التحقق مطلوب');
    }

    // Validate code format (must be 6 digits)
    const trimmedCode = params.code.trim();
    if (trimmedCode.length !== 6 || !/^\d{6}$/.test(trimmedCode)) {
      throw new Error('رمز التحقق يجب أن يكون مكون من 6 أرقام');
    }

    // Validate loginAttemptId format
    const trimmedLoginAttemptId = params.loginAttemptId.trim();
    if (trimmedLoginAttemptId.length < 10 || trimmedLoginAttemptId.length > 100) {
      throw new Error('معرف محاولة تسجيل الدخول غير صحيح');
    }

    try {
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
    } catch (error: any) {
      throw error;
    }
  };

  const resendTwoFactorCode = async (params: {
    loginAttemptId: string;
    method?: 'email' | 'sms';
  }) => {
    // Enhanced input validation
    if (!params || typeof params !== 'object') {
      throw new Error('بيانات إعادة الإرسال مطلوبة');
    }

    if (!params.loginAttemptId || typeof params.loginAttemptId !== 'string' || params.loginAttemptId.trim().length === 0) {
      throw new Error('معرف محاولة تسجيل الدخول مطلوب');
    }

    // Validate loginAttemptId format
    const trimmedLoginAttemptId = params.loginAttemptId.trim();
    if (trimmedLoginAttemptId.length < 10 || trimmedLoginAttemptId.length > 100) {
      throw new Error('معرف محاولة تسجيل الدخول غير صحيح');
    }

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
    try {
      // Redirect to social login endpoint
      window.location.href = `/api/auth/${provider}?redirect=${encodeURIComponent(window.location.pathname)}`;
    } catch (error: any) {
      throw error;
    }
  };

  return {
    user,
    login,
    verifyTwoFactor,
    resendTwoFactorCode,
    loginWithSocial,
  };
}

