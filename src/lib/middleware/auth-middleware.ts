import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import type { TokenVerificationResult } from '@/lib/services/auth-service';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
  sessionId?: string;
}

export interface AuthMiddlewareOptions {
  /**
   * Whether to require authentication (default: true)
   */
  requireAuth?: boolean;
  
  /**
   * Whether to check session validity in database (default: true)
   */
  checkSession?: boolean;
  
  /**
   * Required roles (if any)
   */
  requiredRoles?: string[];
  
  /**
   * Whether to allow unverified email (default: false)
   */
  allowUnverified?: boolean;
  
  /**
   * Custom error handler
   */
  onError?: (error: string, code: string) => NextResponse;
}

/**
 * Authentication middleware for API routes
 * 
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const authResult = await withAuth(request);
 *   if (!authResult.success) {
 *     return authResult.response;
 *   }
 *   const { user, sessionId } = authResult;
 *   // ... your route logic
 * }
 * ```
 */
export async function withAuth(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<
  | { success: true; user: NonNullable<TokenVerificationResult['user']>; sessionId?: string; request: AuthenticatedRequest }
  | { success: false; response: NextResponse }
> {
  const {
    requireAuth = true,
    checkSession = true,
    requiredRoles = [],
    allowUnverified = false,
    onError,
  } = options;

  // Extract token from various sources with validation
  const token = authService.extractToken(request);

  // Enhanced token validation
  if (token && typeof token === 'string') {
    // Basic JWT format validation (should have 3 parts separated by dots)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3 || tokenParts.some(part => part.length === 0)) {
      const errorResponse = NextResponse.json(
        {
          error: 'رمز المصادقة غير صحيح',
          code: 'INVALID_TOKEN_FORMAT',
        },
        { status: 401 }
      );

      if (onError) {
        return { success: false, response: onError('INVALID_TOKEN_FORMAT', 'INVALID_TOKEN_FORMAT') };
      }

      return { success: false, response: errorResponse };
    }
  }

  // If authentication is required but no token provided
  if (requireAuth && !token) {
    const errorResponse = NextResponse.json(
      {
        error: 'يتطلب هذا الطلب تسجيل الدخول.',
        code: 'UNAUTHORIZED',
      },
      { status: 401 }
    );

    if (onError) {
      return { success: false, response: onError('UNAUTHORIZED', 'UNAUTHORIZED') };
    }

    return { success: false, response: errorResponse };
  }

  // If no token and auth not required, return success without user
  if (!token) {
    return {
      success: true,
      user: null as any,
      request: request as AuthenticatedRequest,
    };
  }

  // Verify token with timeout protection
  let verification: TokenVerificationResult;
  try {
    const verifyPromise = authService.verifyTokenFromInput(token, checkSession);
    const timeoutPromise = new Promise<TokenVerificationResult>((resolve) => {
      setTimeout(() => {
        resolve({
          isValid: false,
          error: 'انتهت مهلة التحقق من المصادقة',
        });
      }, 5000); // 5 second timeout
    });

    verification = await Promise.race([verifyPromise, timeoutPromise]);
  } catch (error) {
    const errorResponse = NextResponse.json(
      {
        error: 'حدث خطأ أثناء التحقق من المصادقة.',
        code: 'VERIFICATION_ERROR',
      },
      { status: 500 }
    );

    if (onError) {
      return { success: false, response: onError('VERIFICATION_ERROR', 'VERIFICATION_ERROR') };
    }

    return { success: false, response: errorResponse };
  }

  if (!verification.isValid || !verification.user) {
    const errorResponse = NextResponse.json(
      {
        error: verification.error || 'انتهت صلاحية الجلسة الحالية.',
        code: 'INVALID_OR_EXPIRED_TOKEN',
      },
      { status: 401 }
    );

    if (onError) {
      return { success: false, response: onError('INVALID_OR_EXPIRED_TOKEN', 'INVALID_OR_EXPIRED_TOKEN') };
    }

    return { success: false, response: errorResponse };
  }

  // Enhanced role validation
  if (requiredRoles.length > 0) {
    const userRole = verification.user.role || 'user';
    
    // Validate role format
    if (typeof userRole !== 'string' || userRole.trim().length === 0) {
      const errorResponse = NextResponse.json(
        {
          error: 'دور المستخدم غير صحيح',
          code: 'INVALID_USER_ROLE',
        },
        { status: 403 }
      );

      if (onError) {
        return { success: false, response: onError('INVALID_USER_ROLE', 'INVALID_USER_ROLE') };
      }

      return { success: false, response: errorResponse };
    }

    // Check if user has required role
    if (!requiredRoles.includes(userRole)) {
      const errorResponse = NextResponse.json(
        {
          error: 'ليس لديك صلاحية للوصول إلى هذا المورد.',
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );

      if (onError) {
        return { success: false, response: onError('FORBIDDEN', 'FORBIDDEN') };
      }

      return { success: false, response: errorResponse };
    }
  }

  // Attach user to request object
  const authenticatedRequest = request as AuthenticatedRequest;
  authenticatedRequest.user = verification.user;
  authenticatedRequest.sessionId = verification.sessionId;

  return {
    success: true,
    user: verification.user,
    sessionId: verification.sessionId,
    request: authenticatedRequest,
  };
}

/**
 * Helper to create authenticated route handler
 */
export function createAuthHandler(
  handler: (request: AuthenticatedRequest, user: NonNullable<TokenVerificationResult['user']>, sessionId?: string) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = {}
) {
  return async (request: NextRequest) => {
    const authResult = await withAuth(request, options);
    
    if (!authResult.success) {
      return authResult.response;
    }

    return handler(authResult.request, authResult.user, authResult.sessionId);
  };
}

/**
 * Middleware for role-based access control
 */
export function requireRole(...roles: string[]) {
  return (request: NextRequest, options: Omit<AuthMiddlewareOptions, 'requiredRoles'> = {}) => {
    return withAuth(request, { ...options, requiredRoles: roles });
  };
}

/**
 * Middleware for admin-only access
 */
export function requireAdmin(request: NextRequest, options: Omit<AuthMiddlewareOptions, 'requiredRoles'> = {}) {
  return withAuth(request, { ...options, requiredRoles: ['admin'] });
}

