import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService, AuthService } from '@/lib/auth-service';
import { securityLogger } from '@/lib/security-logger';
import { securityNotificationService } from '@/lib/security/security-notifications';
import { passwordHistoryService } from '@/lib/services/password-history-service';
import { prisma } from '@/lib/db';
import { createErrorResponse, passwordSchema, isConnectionError } from '@/app/api/auth/_helpers';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/change-password
 * طھط؛ظٹظٹط± ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ظ„ظ„ظ…ط³طھط®ط¯ظ…
 */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط­ط§ظ„ظٹط© ظ…ط·ظ„ظˆط¨ط©'),
  newPassword: passwordSchema,
});

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    const ip = authService.getClientIP(req);
    const userAgent = authService.getUserAgent(req);

    try {
      // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„طھظˆظƒظ†
      const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'ط؛ظٹط± ظ…طµط±ط­. ظٹط±ط¬ظ‰ طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط£ظˆظ„ط§ظ‹.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const verification = await authService.verifyTokenFromInput(token);

    if (!verification.isValid || !verification.user) {
      return NextResponse.json(
        {
          error: 'ط±ظ…ط² ط؛ظٹط± طµط§ظ„ط­ ط£ظˆ ظ…ظ†طھظ‡ظٹ ط§ظ„طµظ„ط§ط­ظٹط©.',
          code: 'INVALID_TOKEN',
        },
        { status: 401 }
      );
    }

    const userId = verification.user.id;

      // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† طµط­ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط¯ط®ظ„ط©
      const body = await req.json().catch(() => ({}));
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'ط¨ظٹط§ظ†ط§طھ ط؛ظٹط± طµط­ظٹط­ط©',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    // ط§ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ ط§ظ„ظ…ط³طھط®ط¯ظ… ظ…ظ† ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          passwordHash: true,
        },
      });
    } catch (dbError) {
      logger.error('Database error while finding user:', dbError);
      
      if (isConnectionError(dbError)) {
        return NextResponse.json(
          {
            error: 'ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„: ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„ط§طھطµط§ظ„ ط¨ط§ظ„ط®ط§ط¯ظ…. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹.',
            code: 'CONNECTION_ERROR',
          },
          { status: 503 }
        );
      }
      
      throw dbError;
    }

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        {
          error: 'ط§ظ„ظ…ط³طھط®ط¯ظ… ط؛ظٹط± ظ…ظˆط¬ظˆط¯.',
          code: 'USER_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط­ط§ظ„ظٹط©
    const isCurrentPasswordValid = await AuthService.comparePasswords(
      currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      // طھط³ط¬ظٹظ„ ظ…ط­ط§ظˆظ„ط© ظپط§ط´ظ„ط©
      await securityLogger.logEvent({
        userId,
        eventType: 'LOGIN_FAILED',
        ip,
        userAgent,
        metadata: { reason: 'Invalid current password for password change' },
      });

      await authService.logSecurityEvent(userId, 'password_change_failed', ip, {
        userAgent,
        reason: 'invalid_current_password',
      });

      return NextResponse.json(
        {
          error: 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط­ط§ظ„ظٹط© ط؛ظٹط± طµط­ظٹط­ط©.',
          code: 'INVALID_CURRENT_PASSWORD',
        },
        { status: 401 }
      );
    }

    // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط£ظ† ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط¬ط¯ظٹط¯ط© ظ…ط®طھظ„ظپط©
    const isSamePassword = await AuthService.comparePasswords(
      newPassword,
      user.passwordHash
    );

    if (isSamePassword) {
      return NextResponse.json(
        {
          error: 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط¬ط¯ظٹط¯ط© ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† ظ…ط®طھظ„ظپط© ط¹ظ† ط§ظ„ط­ط§ظ„ظٹط©.',
          code: 'SAME_PASSWORD',
        },
        { status: 400 }
      );
    }

    // ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط£ظ† ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط¬ط¯ظٹط¯ط© ظ„ظٹط³طھ ظپظٹ ط§ظ„ط³ط¬ظ„
    const historyCheck = await passwordHistoryService.checkPasswordInHistory(userId, newPassword);
    if (historyCheck.exists) {
      return NextResponse.json(
        {
          error: historyCheck.message || 'ظ„ط§ ظٹظ…ظƒظ† ط¥ط¹ط§ط¯ط© ط§ط³طھط®ط¯ط§ظ… ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ظ‡ط°ظ‡. ظٹط±ط¬ظ‰ ط§ط®طھظٹط§ط± ظƒظ„ظ…ط© ظ…ط±ظˆط± ط¬ط¯ظٹط¯ط©.',
          code: 'PASSWORD_IN_HISTORY',
        },
        { status: 400 }
      );
    }

    // طھط´ظپظٹط± ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط¬ط¯ظٹط¯ط©
    let newPasswordHash: string;
    try {
      newPasswordHash = await AuthService.hashPassword(newPassword);
    } catch (hashError) {
      logger.error('Password hashing error:', hashError);
      return NextResponse.json(
        {
          error: 'ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ظ…ط¹ط§ظ„ط¬ط© ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±. ط­ط§ظˆظ„ ظ…ط±ط© ط£ط®ط±ظ‰.',
          code: 'HASH_ERROR',
        },
        { status: 500 }
      );
    }

    // طھط­ط¯ظٹط« ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ظˆط­ظپط¸ ط§ظ„ظ‚ط¯ظٹظ…ط© ظپظٹ ط§ظ„ط³ط¬ظ„
    try {
      // ط­ظپط¸ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ظ‚ط¯ظٹظ…ط© ظپظٹ ط§ظ„ط³ط¬ظ„ ظ‚ط¨ظ„ طھط­ط¯ظٹط«ظ‡ط§
      await passwordHistoryService.savePasswordHistory(userId, user.passwordHash);
      
      const now = new Date();
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          passwordChangedAt: now,
          updatedAt: now,
        },
      });
    } catch (dbError) {
      logger.error('Database error while updating password:', dbError);
      
      if (isConnectionError(dbError)) {
        return NextResponse.json(
          {
            error: 'ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„: ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„ط§طھطµط§ظ„ ط¨ط§ظ„ط®ط§ط¯ظ…. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹.',
            code: 'CONNECTION_ERROR',
          },
          { status: 503 }
        );
      }
      
      throw dbError;
    }

    // طھط³ط¬ظٹظ„ ط§ظ„ط­ط¯ط« ظˆط¥ط±ط³ط§ظ„ ط¥ط´ط¹ط§ط±
    try {
      await securityLogger.logPasswordChanged(userId, ip, userAgent);
      await authService.logSecurityEvent(userId, 'password_changed', ip, {
        userAgent,
      });
      await securityNotificationService.notifyPasswordChanged(userId, ip);
    } catch (notificationError) {
      // ظ„ط§ ظ†ظپط´ظ„ ط§ظ„ط¹ظ…ظ„ظٹط© ط¥ط°ط§ ظپط´ظ„ ط§ظ„ط¥ط´ط¹ط§ط±
      logger.error('Failed to send password change notification:', notificationError);
    }

    return NextResponse.json({
      message: 'طھظ… طھط؛ظٹظٹط± ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط¨ظ†ط¬ط§ط­.',
      success: true,
    });
  } catch (error) {
    logger.error('Change password error:', error);
    
    // Log security event safely
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const verification = await authService.verifyTokenFromInput(token);
        if (verification.isValid && verification.user) {
          await authService.logSecurityEvent(verification.user.id, 'password_change_error', ip, {
            userAgent,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (logError) {
      logger.error('Failed to log security event:', logError);
    }

    return createErrorResponse(
      error,
      'ط­ط¯ط« ط®ط·ط£ ط؛ظٹط± ظ…طھظˆظ‚ط¹ ط£ط«ظ†ط§ط، طھط؛ظٹظٹط± ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±. ط­ط§ظˆظ„ ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹.'
    );
    }
  });
}

