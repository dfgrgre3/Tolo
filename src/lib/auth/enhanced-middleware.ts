/**
 * Enhanced Authentication Middleware
 * Middleware محسن ومتكامل للمصادقة
 * 
 * يوفر:
 * - تكامل مع Unified Auth Manager
 * - معالجة ذكية للأخطاء
 * - استعادة تلقائية
 * - دعم الوضع غير المتصل
 */

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { getErrorRecoveryManager } from './error-recovery';
import { logger } from '@/lib/logger';
import type { TokenVerificationResult } from '@/lib/services/auth-service';

type AuthUser = NonNullable<TokenVerificationResult['user']>;

export interface EnhancedAuthOptions {
  /**
   * يتطلب المصادقة
   */
  requireAuth?: boolean;

  /**
   * التحقق من الجلسة في قاعدة البيانات
   */
  checkSession?: boolean;

  /**
   * الأدوار المطلوبة
   */
  requiredRoles?: string[];

  /**
   * السماح بالبريد غير المؤكد
   */
  allowUnverified?: boolean;

  /**
   * إعادة المحاولة التلقائية عند الفشل
   */
  autoRetry?: boolean;

  /**
   * معالج الأخطاء المخصص
   */
  onError?: (error: string, code: string, request: NextRequest) => NextResponse;
}

export type EnhancedAuthResult = {
  success: true;
  user: NonNullable<TokenVerificationResult['user']>;
  sessionId?: string;
  request: NextRequest;
} | {
  success: false;
  response: NextResponse;
}

/**
 * Enhanced Auth Middleware
 * يوفر تكامل أفضل مع نظام المصادقة الموحد
 */
export async function withEnhancedAuth(
  request: NextRequest,
  options: EnhancedAuthOptions = {}
): Promise<EnhancedAuthResult> {
  const {
    requireAuth = true,
    checkSession = true,
    requiredRoles = [],
    allowUnverified = false,
    autoRetry = true,
    onError,
  } = options;

  const recoveryManager = getErrorRecoveryManager();

  // Enhanced token extraction with validation
  const extractToken = async (): Promise<string | null> => {
    try {
      const token = authService.extractToken(request);

      // Validate token format if present
      if (token && typeof token === 'string') {
        // Basic JWT format validation (should have 3 parts separated by dots)
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3 || tokenParts.some(part => part.length === 0)) {
          logger.warn('Invalid token format detected in middleware');
          return null;
        }
      }

      return token;
    } catch (error) {
      logger.error('Token extraction error:', error);
      return null;
    }
  };

  // Enhanced token verification with timeout protection
  const verifyToken = async (token: string): Promise<TokenVerificationResult> => {
    // Validate token format before verification
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return {
        isValid: false,
        error: 'رمز المصادقة غير صحيح',
      };
    }

    const verifyFunction = async (): Promise<TokenVerificationResult> => {
      const verifyPromise = authService.verifyTokenFromInput(token, checkSession);
      const timeoutPromise = new Promise<TokenVerificationResult>((resolve) => {
        setTimeout(() => {
          resolve({
            isValid: false,
            error: 'انتهت مهلة التحقق من المصادقة',
          });
        }, 5000); // 5 second timeout
      });

      return await Promise.race([verifyPromise, timeoutPromise]);
    };

    if (autoRetry) {
      return await recoveryManager.retryWithBackoff(
        verifyFunction,
        {
          maxRetries: 2,
          retryDelay: 500,
        }
      );
    }

    return await verifyFunction();
  };

  // معالجة الخطأ
  const handleError = (error: string, code: string): NextResponse => {
    if (onError) {
      return onError(error, code, request);
    }

    return NextResponse.json(
      {
        error,
        code,
      },
      { status: code === 'UNAUTHORIZED' ? 401 : code === 'FORBIDDEN' ? 403 : 500 }
    );
  };

  try {
    // استخراج التوكن
    const token = await extractToken();

    // التحقق من وجود التوكن
    if (requireAuth && !token) {
      return {
        success: false,
        response: handleError('يتطلب هذا الطلب تسجيل الدخول.', 'UNAUTHORIZED'),
      };
    }

    // إذا لم يكن مطلوباً التوكن
    if (!token) {
      return {
        success: true,
        user: null as any,
        request,
      };
    }

    // التحقق من التوكن
    const verification = await verifyToken(token);

    if (!verification.isValid || !verification.user) {
      return {
        success: false,
        response: handleError(
          verification.error || 'انتهت صلاحية الجلسة الحالية.',
          'INVALID_OR_EXPIRED_TOKEN'
        ),
      };
    }

    // التحقق من تأكيد البريد الإلكتروني
    if (!allowUnverified && !(verification.user as { emailVerified?: boolean }).emailVerified) {
      return {
        success: false,
        response: handleError(
          'يرجى تأكيد بريدك الإلكتروني أولاً.',
          'EMAIL_NOT_VERIFIED'
        ),
      };
    }

    // التحقق من الأدوار المطلوبة
    if (requiredRoles.length > 0) {
      const userRole = verification.user.role || 'user';
      if (!requiredRoles.includes(userRole)) {
        return {
          success: false,
          response: handleError(
            'ليس لديك صلاحية للوصول إلى هذا المورد.',
            'FORBIDDEN'
          ),
        };
      }
    }

    // إرفاق المستخدم بالطلب
    const authenticatedRequest = request as NextRequest & {
      user: NonNullable<TokenVerificationResult['user']>;
      sessionId?: string;
    };
    authenticatedRequest.user = verification.user;
    authenticatedRequest.sessionId = verification.sessionId;

    return {
      success: true,
      user: verification.user,
      sessionId: verification.sessionId,
      request: authenticatedRequest,
    };
  } catch (error: any) {
    logger.error('Enhanced auth middleware error:', error);

    // معالجة الأخطاء
    if (error?.code === 'UNAUTHORIZED' || error?.status === 401) {
      return {
        success: false,
        response: handleError('انتهت صلاحية الجلسة.', 'UNAUTHORIZED'),
      };
    }

    if (error?.code === 'FORBIDDEN' || error?.status === 403) {
      return {
        success: false,
        response: handleError('ليس لديك صلاحية.', 'FORBIDDEN'),
      };
    }

    return {
      success: false,
      response: handleError(
        'حدث خطأ أثناء التحقق من المصادقة.',
        'AUTH_ERROR'
      ),
    };
  }
}

/**
 * Helper لإنشاء معالج Route محمي
 */
export function createEnhancedAuthHandler(
  handler: (
    request: NextRequest & { user: NonNullable<TokenVerificationResult['user']>; sessionId?: string },
    user: NonNullable<TokenVerificationResult['user']>,
    sessionId?: string
  ) => Promise<NextResponse>,
  options: EnhancedAuthOptions = {}
) {
  return async (request: NextRequest) => {
    const authResult = await withEnhancedAuth(request, options);

    if (!authResult.success) {
      return authResult.response;
    }

    return handler(authResult.request as NextRequest & { user: AuthUser; sessionId?: string }, authResult.user, authResult.sessionId);
  };
}

/**
 * Middleware للأدوار المطلوبة
 */
export function requireRole(...roles: string[]) {
  return (request: NextRequest, options: Omit<EnhancedAuthOptions, 'requiredRoles'> = {}) => {
    return withEnhancedAuth(request, { ...options, requiredRoles: roles });
  };
}

/**
 * Middleware للمسؤولين فقط
 */
export function requireAdmin(request: NextRequest, options: Omit<EnhancedAuthOptions, 'requiredRoles'> = {}) {
  return withEnhancedAuth(request, { ...options, requiredRoles: ['admin'] });
}

