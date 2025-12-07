import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { withEnhancedAuth } from '@/lib/auth/enhanced-middleware';
import { prisma } from '@/lib/db';
import { isConnectionError } from '@/app/api/auth/_helpers';
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import { logger } from '@/lib/logger';

/**
 * GET /api/auth/status
 * 
 * طھط­ظ‚ظ‚ ظ…ظ† ط­ط§ظ„ط© ط§ظ„ظ…طµط§ط¯ظ‚ط© ط§ظ„ط­ط§ظ„ظٹط© ظ„ظ„ظ…ط³طھط®ط¯ظ…
 * ظٹط¹ظٹط¯ ظ…ط¹ظ„ظˆظ…ط§طھ ط£ط³ط§ط³ظٹط© ط¹ظ† ط­ط§ظ„ط© ط§ظ„ط¬ظ„ط³ط© ط¨ط¯ظˆظ† ظƒط´ظپ ظ…ط¹ظ„ظˆظ…ط§طھ ط­ط³ط§ط³ط©
 * 
 * Response:
 * - authenticated: boolean - ظ‡ظ„ ط§ظ„ظ…ط³طھط®ط¯ظ… ظ…ط³ط¬ظ„ ط¯ط®ظˆظ„
 * - user: { id, email, name, role } - ظ…ط¹ظ„ظˆظ…ط§طھ ط§ظ„ظ…ط³طھط®ط¯ظ… ط§ظ„ط£ط³ط§ط³ظٹط©
 * - sessionId: string - ظ…ط¹ط±ظپ ط§ظ„ط¬ظ„ط³ط©
 * - expiresAt: string - طھط§ط±ظٹط® ط§ظ†طھظ‡ط§ط، ط§ظ„ط¬ظ„ط³ط©
 * - twoFactorEnabled: boolean - ظ‡ظ„ طھظ… طھظپط¹ظٹظ„ ط§ظ„ظ…طµط§ط¯ظ‚ط© ط¨ط®ط·ظˆطھظٹظ†
 * - emailVerified: boolean - ظ‡ظ„ طھظ… ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Use enhanced auth middleware with auto-retry
      const authResult = await withEnhancedAuth(req, {
        requireAuth: false, // Don't require auth, just check if exists
        checkSession: true,
        autoRetry: true, // ط¥ط¹ط§ط¯ط© ط§ظ„ظ…ط­ط§ظˆظ„ط© ط§ظ„طھظ„ظ‚ط§ط¦ظٹط©
      });

      // If not authenticated, return unauthenticated status
      if (!authResult.success || !authResult.user) {
        return NextResponse.json({
          authenticated: false,
          message: 'ط§ظ„ظ…ط³طھط®ط¯ظ… ط؛ظٹط± ظ…ط³ط¬ظ„ ط¯ط®ظˆظ„',
        });
      }

      const { user, sessionId } = authResult;

      // Get session expiry if session ID exists
      let expiresAt: Date | null = null;
      if (sessionId) {
        try {
          const session = await authService.getSession(sessionId);
          if (session) {
            expiresAt = (session as { expiresAt?: Date }).expiresAt || null;
          }
        } catch (sessionError) {
          // Log but don't fail - session might be expired
          logger.warn('Failed to get session expiry:', sessionError);
        }
      }

      // Get user details from database (non-sensitive fields only)
      let userDetails;
      try {
        userDetails = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            twoFactorEnabled: true,
            emailVerified: true,
            lastLogin: true,
          },
        });
      } catch (dbError) {
        logger.error('Database error while fetching user details:', dbError);
        
        if (isConnectionError(dbError)) {
          // Return basic info even if DB fails
          return NextResponse.json({
            authenticated: true,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
            sessionId,
            expiresAt: expiresAt?.toISOString(),
            warning: 'ط­ط¯ط« ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ',
          });
        }
        
        throw dbError;
      }

      if (!userDetails) {
        return NextResponse.json(
          {
            authenticated: false,
            error: 'طھط¹ط°ط± ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط­ط³ط§ط¨ ط§ظ„ظ…ط³طھط®ط¯ظ….',
            code: 'USER_NOT_FOUND',
          },
          { status: 404 }
        );
      }

      // Return authenticated status with user info
      return NextResponse.json({
        authenticated: true,
        user: {
          id: userDetails.id,
          email: userDetails.email,
          name: userDetails.name || undefined,
          role: userDetails.role || 'user',
        },
        sessionId,
        expiresAt: expiresAt?.toISOString(),
        twoFactorEnabled: userDetails.twoFactorEnabled || false,
        emailVerified: userDetails.emailVerified || false,
        lastLogin: userDetails.lastLogin?.toISOString(),
      });
    } catch (error) {
      logger.error('Auth status check error:', error);
      
      // Return error response
      return NextResponse.json(
        {
          authenticated: false,
          error: 'ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط­ط§ظ„ط© ط§ظ„ظ…طµط§ط¯ظ‚ط©.',
          code: 'STATUS_CHECK_ERROR',
        },
        { status: 500 }
      );
    }
  });
}

