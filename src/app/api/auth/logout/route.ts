import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
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

/**
 * Helper to extract and validate session from token
 */
async function extractSessionFromToken(token: string | null): Promise<{
  sessionId: string | null;
  userId: string | null;
}> {
  if (!token) return { sessionId: null, userId: null };

  try {
    const decoded = await authService.verifyTokenFromInput(token);
    if (decoded.isValid && decoded.sessionId) {
      const session = await authService.getSession(decoded.sessionId);
      return {
        sessionId: decoded.sessionId,
        userId: session?.userId || decoded.user?.userId || null
      };
    }
  } catch {
    // Silent fail - logout should proceed regardless
  }

  return { sessionId: null, userId: null };
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    const { ip, userAgent } = extractRequestMetadata(req);

    try {
      // Extract token
      const token = authService.extractToken(req);

      // Parse body for logout options
      const bodyResult = await parseRequestBody<{
        logoutAllDevices?: boolean;
      }>(req, { maxSize: 128, required: false });

      const logoutAllDevices = bodyResult.success && bodyResult.data.logoutAllDevices === true;

      // Get session info from token
      const { sessionId, userId } = await extractSessionFromToken(token);

      // Execute logout operations if we have valid session info
      if (userId) {
        try {
          if (logoutAllDevices) {
            await authService.revokeAllUserSessions(userId);
          } else if (sessionId) {
            await authService.revokeSession(sessionId, userId);
          }

          // Log security event (non-blocking)
          logSecurityEventSafely(
            userId,
            logoutAllDevices ? 'logout_all_devices' : 'logout',
            { ip, userAgent, sessionId }
          ).catch(() => { /* Silent fail for logging */ });
        } catch (error) {
          logger.warn('Error during logout cleanup:', error);
          // Continue - don't fail the logout
        }
      }

      // Create response
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
