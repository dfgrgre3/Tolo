import { NextRequest, NextResponse } from 'next/server';
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import { logger } from '@/lib/logger';
import { LoginService } from '@/lib/services/login-service';
import { 
  setAuthCookies, 
  createStandardErrorResponse,
  parseRequestBody,
  addSecurityHeaders
} from '@/app/api/auth/_helpers';
import type { LoginResponse } from '@/types/api/auth';

/**
 * POST /api/auth/login
 * 
 * Login route handler
 * Delegates all business logic to LoginService for better separation of concerns
 * 
 * Security improvements:
 * - Comprehensive input validation and sanitization
 * - Timeout protection for login operations
 * - Better error handling and logging
 * - Security headers in responses
 * 
 * Request Body:
 * - email: string
 * - password: string
 * - rememberMe?: boolean
 * 
 * Response:
 * - Success: LoginResponse with token and user data
 * - Two-factor: Response with requiresTwoFactor flag
 * - Error: Error response with appropriate status code
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  return opsWrapper(request, async (req) => {
    try {
      // Parse and validate request body using standardized helper
      const bodyResult = await parseRequestBody<{
        email?: string;
        password?: string;
        rememberMe?: boolean;
        deviceFingerprint?: any;
        captchaToken?: string;
      }>(req, {
        maxSize: 2048, // 2KB max (increased for device fingerprint)
        required: true,
      });

      if (!bodyResult.success) {
        return bodyResult.error;
      }

      const body = bodyResult.data;

      // Enhanced validation for required fields with comprehensive checks
      if (!body.email || typeof body.email !== 'string') {
        return NextResponse.json(
          { error: 'البريد الإلكتروني مطلوب', code: 'MISSING_EMAIL' },
          { status: 400 }
        );
      }

      // Validate email length (RFC 5321 limit)
      if (body.email.length > 254) {
        return NextResponse.json(
          { error: 'البريد الإلكتروني طويل جداً', code: 'EMAIL_TOO_LONG' },
          { status: 400 }
        );
      }

      const normalizedEmail = body.email.trim().toLowerCase();
      if (normalizedEmail.length === 0) {
        return NextResponse.json(
          { error: 'البريد الإلكتروني لا يمكن أن يكون فارغاً', code: 'INVALID_EMAIL' },
          { status: 400 }
        );
      }

      // Enhanced email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return NextResponse.json(
          { error: 'صيغة البريد الإلكتروني غير صحيحة', code: 'INVALID_EMAIL_FORMAT' },
          { status: 400 }
        );
      }

      // Additional security: Check for potentially malicious email patterns
      if (normalizedEmail.includes('..') || normalizedEmail.startsWith('.') || normalizedEmail.endsWith('.')) {
        return NextResponse.json(
          { error: 'صيغة البريد الإلكتروني غير صحيحة', code: 'INVALID_EMAIL_FORMAT' },
          { status: 400 }
        );
      }

      // Enhanced password validation with comprehensive checks
      if (!body.password || typeof body.password !== 'string') {
        return NextResponse.json(
          { error: 'كلمة المرور مطلوبة', code: 'MISSING_PASSWORD' },
          { status: 400 }
        );
      }

      if (body.password.length === 0) {
        return NextResponse.json(
          { error: 'كلمة المرور لا يمكن أن تكون فارغة', code: 'INVALID_PASSWORD' },
          { status: 400 }
        );
      }

      // Password length validation (security best practice)
      // Minimum length check (should be handled by schema, but double-check here)
      if (body.password.length < 8) {
        return NextResponse.json(
          { error: 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل', code: 'PASSWORD_TOO_SHORT' },
          { status: 400 }
        );
      }

      // Maximum length validation (security - prevent DoS attacks)
      if (body.password.length > 128) {
        return NextResponse.json(
          { error: 'كلمة المرور طويلة جداً', code: 'PASSWORD_TOO_LONG' },
          { status: 400 }
        );
      }

      // Delegate all business logic to LoginService (with timeout protection)
      const loginPromise = LoginService.login(req, {
        ...body,
        email: normalizedEmail, // Use normalized email
      });
      
      const timeoutPromise = new Promise<{ success: false; response: { error: string; code: string }; statusCode: number }>((resolve) => {
        setTimeout(() => {
          resolve({
            success: false,
            response: {
              error: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.',
              code: 'REQUEST_TIMEOUT',
            },
            statusCode: 408,
          });
        }, 25000); // 25 second timeout (slightly less than API_TIMEOUT)
      });

      const result = await Promise.race([loginPromise, timeoutPromise]);
      
      // Check if timeout occurred
      if (result && 'statusCode' in result && result.statusCode === 408) {
        logger.warn('Login request timeout', { email: normalizedEmail });
        const timeoutResponse = NextResponse.json(
          { error: 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.', code: 'REQUEST_TIMEOUT' },
          { status: 408 }
        );
        return addSecurityHeaders(timeoutResponse);
      }

      // Handle two-factor response
      if (result.success && 'requiresTwoFactor' in result.response && result.response.requiresTwoFactor) {
        const response = NextResponse.json(result.response, { status: result.statusCode });
        return addSecurityHeaders(response);
      }

      // Handle successful login
      if (result.success && 'token' in result.response) {
        const loginResponse = result.response as LoginResponse;
        const response = NextResponse.json(loginResponse, { status: result.statusCode });
        
        // Set authentication cookies
        setAuthCookies(
          response,
          loginResponse.token,
          loginResponse.refreshToken || '',
          body.rememberMe ?? false
        );

        return addSecurityHeaders(response);
      }

      // Handle error response
      const errorResponse = NextResponse.json(result.response, { status: result.statusCode });
      return addSecurityHeaders(errorResponse);

    } catch (error: unknown) {
      // Enhanced error logging - log full error details on server only
      const duration = Date.now() - startTime;
      logger.error('Login route error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        duration,
      });

      // Use unified error handling to prevent sensitive information leakage
      // This ensures all error messages sent to client are safe and generic,
      // while full details are logged on the server only
      return createStandardErrorResponse(
        error,
        'حدث خطأ داخلي في الخادم. يرجى المحاولة مرة أخرى لاحقاً.'
      );
    }
  });
}
