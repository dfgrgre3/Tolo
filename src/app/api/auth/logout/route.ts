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



export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    const { ip, userAgent } = extractRequestMetadata(req);

    try {
      // Get User ID from middleware headers
      const userId = req.headers.get("x-user-id");

      // Parse body for logout options
      const bodyResult = await parseRequestBody<{
        logoutAllDevices?: boolean;
      }>(req, { maxSize: 128, required: false });

      const logoutAllDevices = bodyResult.success && bodyResult.data.logoutAllDevices === true;

      // Execute logout operations if we have a valid user
      if (userId) {
        try {
          if (logoutAllDevices) {
            await authService.revokeAllUserSessions(userId);
          }
          // Note: Individual session revocation requires sessionId, which is not available in x-user-id.
          // For standard logout, clearing cookies is sufficient as the client loses access.

          // Log security event (non-blocking)
          logSecurityEventSafely(
            userId,
            logoutAllDevices ? 'logout_all_devices' : 'logout',
            { ip, userAgent }
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
