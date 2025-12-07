import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) => {
    try {
      // Await params in Next.js 16
      const { id } = await params;

      // Enhanced session ID validation
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return NextResponse.json(
          {
            error: 'معرف الجلسة مطلوب',
            code: 'MISSING_SESSION_ID',
          },
          { status: 400 }
        );
      }

      const trimmedSessionId = id.trim();

      // Validate session ID format
      if (trimmedSessionId.length < 10 || trimmedSessionId.length > 100) {
        return NextResponse.json(
          {
            error: 'معرف الجلسة غير صحيح',
            code: 'INVALID_SESSION_ID',
          },
          { status: 400 }
        );
      }

      // Enhanced authentication verification with timeout protection
      const verifyPromise = authService.verifyTokenFromRequest(req);
      const timeoutPromise = new Promise<{ isValid: false; error: string }>((resolve) => {
        setTimeout(() => {
          resolve({
            isValid: false,
            error: 'انتهت مهلة التحقق من المصادقة',
          });
        }, 5000); // 5 second timeout
      });

      const verification = await Promise.race([verifyPromise, timeoutPromise]);

      if (!verification.isValid || !verification.user) {
        return NextResponse.json(
          {
            error: verification.error || 'غير مصرح',
            code: 'UNAUTHORIZED',
          },
          { status: 401 }
        );
      }

      // Enhanced user ID validation
      if (!verification.user.id || typeof verification.user.id !== 'string' || verification.user.id.trim().length === 0) {
        return NextResponse.json(
          {
            error: 'بيانات المستخدم غير صحيحة',
            code: 'INVALID_USER_DATA',
          },
          { status: 401 }
        );
      }

      const userId = verification.user.id.trim();

      // Validate user ID format
      if (userId.length < 10 || userId.length > 100) {
        return NextResponse.json(
          {
            error: 'معرف المستخدم غير صحيح',
            code: 'INVALID_USER_ID',
          },
          { status: 401 }
        );
      }

      // Verify session belongs to user with timeout protection
      const sessionPromise = prisma.session.findFirst({
        where: {
          id: trimmedSessionId,
          userId,
        },
      });

      const sessionTimeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 3000); // 3 second timeout
      });

      const session = await Promise.race([sessionPromise, sessionTimeoutPromise]);

      if (!session) {
        return NextResponse.json(
          { error: 'الجلسة غير موجودة' },
          { status: 404 }
        );
      }

      // Delete session with timeout protection
      const deletePromise = prisma.session.delete({
        where: { id: trimmedSessionId },
      });

      const deleteTimeoutPromise = new Promise<void>((resolve, reject) => {
        setTimeout(() => reject(new Error('Session deletion timeout')), 3000); // 3 second timeout
      });

      await Promise.race([deletePromise, deleteTimeoutPromise]);

      // Log security event (non-blocking)
      const ip = authService.getClientIP(req) || 'unknown';
      const userAgent = authService.getUserAgent(req) || 'unknown';

      // Sanitize device info
      let deviceInfo = null;
      try {
        if (session.deviceInfo && typeof session.deviceInfo === 'string') {
          const parsed = JSON.parse(session.deviceInfo);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            deviceInfo = parsed;
          }
        }
      } catch {
        // Ignore parsing errors
      }

      authService.logSecurityEvent(
        userId,
        'session_revoked',
        ip,
        {
          userAgent,
          revokedSessionId: trimmedSessionId,
          revokedDevice: deviceInfo,
        }
      ).catch(() => {
        // Silent fail - logging shouldn't block response
      });

      return NextResponse.json({
        message: 'تم إلغاء الجلسة بنجاح',
        sessionId: trimmedSessionId,
      });

    } catch (error) {
      logger.error('Failed to revoke session:', error);
      return NextResponse.json(
        { error: 'فشل إلغاء الجلسة' },
        { status: 500 }
      );
    }
  });
}
