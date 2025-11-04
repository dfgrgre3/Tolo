import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import type { TokenVerificationResult } from '@/lib/auth-service';

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

  // Extract token from various sources
  const token = authService.extractToken(request);

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

  // Verify token
  const verification = await authService.verifyTokenFromInput(token, checkSession);

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

  // Check required roles if specified
  if (requiredRoles.length > 0) {
    const userRole = verification.user.role || 'user';
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

