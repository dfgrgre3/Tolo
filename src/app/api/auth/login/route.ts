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
import { loginSchema } from '@/lib/auth/schemas';
import type { LoginResponse } from '@/types/api/auth';
import { LOGIN_ERRORS } from '@/lib/auth/login-errors';

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
        deviceFingerprint?: Record<string, unknown>;
        captchaToken?: string;
      }>(req, {
        maxSize: 2048, // 2KB max (increased for device fingerprint)
        required: true,
      });

      if (!bodyResult.success) {
        return bodyResult.error;
      }

      const body = bodyResult.data;

      // Validate request body using Zod schema
      const parsed = loginSchema.safeParse(body);

      if (!parsed.success) {
        return createStandardErrorResponse(
          {
            error: 'VALIDATION_ERROR',
            details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
          },
          LOGIN_ERRORS.VALIDATION_ERROR,
          400
        );
      }

      const { email, password, rememberMe, deviceFingerprint, captchaToken } = parsed.data;

      // Delegate all business logic to LoginService (with timeout protection)
      const loginPromise = LoginService.login(req, {
        email,
        password,
        rememberMe,
        deviceFingerprint,
        captchaToken
      });

      const timeoutPromise = new Promise<{ success: false; response: { error: string; code: string }; statusCode: number }>((resolve) => {
        setTimeout(() => {
          resolve({
            success: false,
            response: {
              error: LOGIN_ERRORS.REQUEST_TIMEOUT,
              code: 'REQUEST_TIMEOUT',
            },
            statusCode: 408,
          });
        }, 25000); // 25 second timeout (slightly less than API_TIMEOUT)
      });

      const result = await Promise.race([loginPromise, timeoutPromise]);

      // Check if timeout occurred
      if (result && 'statusCode' in result && result.statusCode === 408) {
        logger.warn('Login request timeout', { email });
        const timeoutResponse = NextResponse.json(
          { error: LOGIN_ERRORS.REQUEST_TIMEOUT, code: 'REQUEST_TIMEOUT' },
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
          loginResponse.token!,
          loginResponse.refreshToken || '',
          rememberMe
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
        LOGIN_ERRORS.UNKNOWN_ERROR
      );
    }
  });
}
