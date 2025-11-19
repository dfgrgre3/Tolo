import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import { 
  clearAuthCookies, 
  createStandardErrorResponse,
  createSuccessResponse,
  parseRequestBody,
  extractRequestMetadata,
  logSecurityEventSafely
} from '@/app/api/auth/_helpers';

import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    const { ip, userAgent } = extractRequestMetadata(req);

    try {
      // Extract token using unified method (checks cookies first, then Authorization header)
      // This ensures consistency with other routes
      const token = authService.extractToken(req);
      let sessionId: string | null = null;

      // Enhanced token verification with timeout and validation
      if (token) {
        // Validate token format before verification
        if (typeof token === 'string' && token.trim().length > 0) {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3 && !tokenParts.some(part => part.length === 0)) {
            const verifyPromise = authService.verifyToken(token);
            const timeoutPromise = new Promise<{ isValid: false }>((resolve) => {
              setTimeout(() => resolve({ isValid: false }), 2000); // 2 second timeout
            });

            const decoded = await Promise.race([verifyPromise, timeoutPromise]);
            if (decoded.isValid && decoded.sessionId) {
              // Validate session ID format
              if (typeof decoded.sessionId === 'string' && decoded.sessionId.trim().length > 0) {
                sessionId = decoded.sessionId.trim();
              }
            }
          }
        }
      }

      // Parse body to check if user wants to logout from all devices
      let logoutAllDevices = false;
      const bodyResult = await parseRequestBody<{
        logoutAllDevices?: boolean;
      }>(req, {
        maxSize: 128,
        required: false,
      });

      if (bodyResult.success && bodyResult.data.logoutAllDevices !== undefined) {
        logoutAllDevices = Boolean(bodyResult.data.logoutAllDevices);
      }

      // Process logout (with timeout protection and enhanced validation)
      if (sessionId && typeof sessionId === 'string' && sessionId.trim().length > 0) {
        // Validate session ID format (should be UUID-like)
        const trimmedSessionId = sessionId.trim();
        if (trimmedSessionId.length >= 10 && trimmedSessionId.length <= 100) {
          // Get session to retrieve userId (with timeout)
          const sessionPromise = authService.getSession(trimmedSessionId);
          const sessionTimeoutPromise = new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), 2000); // 2 second timeout
          });

          const session = await Promise.race([sessionPromise, sessionTimeoutPromise]);
          
          if (session && (session as { userId?: string }).userId) {
            // Validate user ID format
            const userId = typeof (session as { userId: string }).userId === 'string' && (session as { userId: string }).userId.trim().length > 0
              ? (session as { userId: string }).userId.trim()
              : null;

            if (userId) {
              // Execute logout operations in parallel (non-blocking)
              const logoutOperations = Promise.allSettled([
                logoutAllDevices
                  ? authService.deleteAllUserSessions(userId)
                  : authService.deleteSession(trimmedSessionId),
                logSecurityEventSafely(
                  userId,
                  logoutAllDevices ? 'logout_all_devices' : 'logout',
                  {
                    ip,
                    userAgent,
                    sessionId: trimmedSessionId,
                  }
                ),
              ]);

              // Don't wait for operations to complete - logout should be fast
              logoutOperations.catch(() => {
                // Silent fail - logout can proceed
              });
            }
          }
        }
      }

    // Create response with security headers
    const response = createSuccessResponse({
      message: 'تم تسجيل الخروج بنجاح.'
    });

    // Clear all auth cookies
    clearAuthCookies(response);

    return response;
  } catch (error) {
    logger.error('Logout error:', error);
    return createStandardErrorResponse(
      error,
      'حدث خطأ غير متوقع أثناء معالجة طلب تسجيل الخروج. حاول مرة أخرى لاحقاً.'
    );
  }
  });
}