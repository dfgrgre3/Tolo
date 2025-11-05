import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { prisma } from '@/lib/prisma';
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import { createErrorResponse, isConnectionError } from '../_helpers';
import { withAuth } from '@/lib/middleware/auth-middleware';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
  const ip = authService.getClientIP(req);
  const userAgent = authService.getUserAgent(req);

  try {
    // Use auth middleware for cleaner code
    const authResult = await withAuth(req, {
      requireAuth: true,
      checkSession: true,
    });

    if (!authResult.success) {
      return authResult.response;
    }

    const { user } = authResult;
    const userId = user.id;

    // Get user from database with error handling
    let dbUser;
    try {
      dbUser = await prisma.user.findUnique({
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
    } catch (dbError) {
      console.error('Database error while finding user:', dbError);
      
      if (isConnectionError(dbError)) {
        return NextResponse.json(
          {
            error: 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقاً.',
            code: 'CONNECTION_ERROR',
          },
          { status: 503 }
        );
      }
      
      throw dbError;
    }

    if (!dbUser) {
      // Log security event for missing user after valid token
      await authService.logSecurityEvent(userId, 'me_endpoint_user_not_found', ip, {
        userAgent,
        sessionId: authResult.sessionId,
      });

      return NextResponse.json(
        {
          error: 'تعذر العثور على حساب المستخدم.',
          code: 'USER_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: dbUser,
      sessionId: authResult.sessionId,
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    
    // Log security event safely
    try {
      const authResult = await withAuth(req, { requireAuth: false });
      if (authResult.success && authResult.user) {
        await authService.logSecurityEvent(authResult.user.id, 'me_endpoint_error', ip, {
          userAgent,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }

    return createErrorResponse(
      error,
      'حدث خلل أثناء التحقق من الجلسة.'
    );
  }
  });
}
