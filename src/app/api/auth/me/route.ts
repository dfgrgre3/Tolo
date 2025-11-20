import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import { 
  createSuccessResponse, 
  createStandardErrorResponse,
  extractRequestMetadata,
  logSecurityEventSafely,
  withDatabaseQuery
} from '@/app/api/auth/_helpers';
import { withEnhancedAuth } from '@/lib/auth/enhanced-middleware';
import { logger } from '@/lib/logger';

/**
 * GET /api/auth/me
 * 
 * Returns the current authenticated user's information
 * 
 * Requires: Authentication
 * 
 * Response:
 * - user: User object with non-sensitive fields
 * - sessionId: Current session ID
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    const { ip, userAgent } = extractRequestMetadata(req);

    try {
      // Use enhanced auth middleware with auto-retry
      const authResult = await withEnhancedAuth(req, {
        requireAuth: true,
        checkSession: true,
        autoRetry: true,
      });

      if (!authResult.success) {
        // TypeScript discriminated union: when success is false, response exists
        // Cast through unknown first to satisfy TypeScript's strict type checking
        const errorResponse = authResult as unknown as { success: false; response: NextResponse };
        return errorResponse.response;
      }

      // TypeScript now knows authResult.success is true
      const { user, sessionId } = authResult;
      
      // Enhanced user ID validation
      if (!user || !user.id || typeof user.id !== 'string' || user.id.trim().length === 0) {
        return createStandardErrorResponse(
          new Error('Invalid user data from authentication'),
          'بيانات المستخدم غير صحيحة.',
          401
        );
      }

      const userId = user.id.trim();

      // Validate user ID format (should be UUID-like)
      if (userId.length < 10 || userId.length > 100) {
        return createStandardErrorResponse(
          new Error('Invalid user ID format'),
          'معرف المستخدم غير صحيح.',
          401
        );
      }

      // Get user from database with standardized error handling and timeout protection
      const dbResult = await withDatabaseQuery(
        () => {
          const dbPromise = prisma.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              twoFactorEnabled: true,
              emailVerified: true,
              lastLogin: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          const timeoutPromise = new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), 3000); // 3 second timeout
          });

          return Promise.race([dbPromise, timeoutPromise]);
        }
      );

      if (!dbResult.success) {
        return dbResult.response;
      }

      const dbUser = dbResult.data;

      if (!dbUser) {
        // Log security event for missing user after valid token
        await logSecurityEventSafely(userId, 'me_endpoint_user_not_found', {
          ip,
          userAgent,
          sessionId,
        });

        return createStandardErrorResponse(
          new Error('User not found after authentication'),
          'تعذر العثور على حساب المستخدم.',
          404
        );
      }

      // Return success response with user data
      return createSuccessResponse({
        user: dbUser,
        sessionId,
      });
    } catch (error) {
      logger.error('Auth verification error:', error);
      
      // Log security event safely
      try {
        const authResult = await withEnhancedAuth(req, { requireAuth: false });
        if (authResult.success && authResult.user) {
          await logSecurityEventSafely(authResult.user.id, 'me_endpoint_error', {
            ip,
            userAgent,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      } catch (logError) {
        logger.error('Failed to log security event:', logError);
      }

      return createStandardErrorResponse(
        error,
        'حدث خلل أثناء التحقق من الجلسة.'
      );
    }
  });
}
