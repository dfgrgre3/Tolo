import { NextRequest, NextResponse } from 'next/server';
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import { logger } from '@/lib/logger';
import { LoginService } from '@/lib/services/login-service';
import { setAuthCookies, createErrorResponse } from '../_helpers';
import type { LoginResponse } from '@/types/api/auth';

// ==================== MAIN HANDLER ====================

/**
 * Login route handler
 * Delegates all business logic to LoginService for better separation of concerns
 */
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Parse request body
      const contentLength = req.headers.get('content-length');
      if (contentLength === '0' || !contentLength) {
        return NextResponse.json(
          {
            error: 'الطلب فارغ. يرجى إدخال بيانات تسجيل الدخول.',
            code: 'EMPTY_REQUEST_BODY',
          },
          { status: 400 }
        );
      }

      // Check body size limit (prevent DoS)
      const contentLengthNum = parseInt(contentLength, 10);
      const MAX_BODY_SIZE = 1024; // 1KB max
      if (contentLengthNum > MAX_BODY_SIZE) {
        return NextResponse.json(
          {
            error: 'حجم الطلب كبير جداً.',
            code: 'REQUEST_TOO_LARGE',
          },
          { status: 413 }
        );
      }

      let body: any;
      try {
        body = await req.json();
      } catch (jsonError) {
        return NextResponse.json(
          {
            error: 'بيانات الطلب غير صحيحة. يرجى التحقق من صحة البيانات المرسلة.',
            code: 'INVALID_REQUEST_BODY',
          },
          { status: 400 }
        );
      }

      // Delegate all business logic to LoginService
      const result = await LoginService.login(req, body);

      // Handle two-factor response
      if (result.success && 'requiresTwoFactor' in result.response && result.response.requiresTwoFactor) {
        return NextResponse.json(result.response, { status: result.statusCode });
      }

      // Handle successful login
      if (result.success && 'token' in result.response) {
        const loginResponse = result.response as LoginResponse;
        const response = NextResponse.json(loginResponse, { status: result.statusCode });
        
        // Set authentication cookies
        setAuthCookies(
          response,
          loginResponse.token,
          loginResponse.refreshToken,
          body.rememberMe ?? false
        );

        // Add security headers
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-XSS-Protection', '1; mode=block');

        return response;
      }

      // Handle error response
      return NextResponse.json(result.response, { status: result.statusCode });

    } catch (error: unknown) {
      // Enhanced error logging - log full error details on server only
      logger.error('Login route error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });

      // Use unified error handling to prevent sensitive information leakage
      // This ensures all error messages sent to client are safe and generic,
      // while full details are logged on the server only
      return createErrorResponse(
        error,
        'حدث خطأ داخلي في الخادم. يرجى المحاولة مرة أخرى لاحقاً.'
      );
    }
  });
}
