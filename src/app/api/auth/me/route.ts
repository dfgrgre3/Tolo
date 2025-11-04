import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authService } from '@/lib/auth-service';
import { prisma } from '@/lib/prisma';
import { createErrorResponse, isConnectionError } from '../_helpers';

const extractToken = async (request: NextRequest): Promise<string | null> => {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  const cookieStore = await cookies();
  return (
    cookieStore.get('access_token')?.value ??
    cookieStore.get('auth_token')?.value ??
    null
  );
};

export async function GET(request: NextRequest) {
  const ip = authService.getClientIP(request);
  const userAgent = authService.getUserAgent(request);

  try {
    const token = await extractToken(request);

    if (!token) {
      return NextResponse.json(
        {
          error: 'يتطلب هذا الطلب تسجيل الدخول.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    const verification = await authService.verifyTokenFromInput(token, true);

    if (!verification.isValid || !verification.user) {
      return NextResponse.json(
        {
          error: verification.error || 'انتهت صلاحية الجلسة الحالية.',
          code: 'INVALID_OR_EXPIRED_TOKEN',
        },
        { status: 401 }
      );
    }

    const userId = verification.user.id;

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
        sessionId: verification.sessionId,
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
      sessionId: verification.sessionId,
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    
    // Log security event safely
    try {
      const token = await extractToken(request);
      if (token) {
        const verification = await authService.verifyTokenFromInput(token, true);
        if (verification.isValid && verification.user) {
          await authService.logSecurityEvent(verification.user.id, 'me_endpoint_error', ip, {
            userAgent,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }

    return createErrorResponse(
      error,
      'حدث خلل أثناء التحقق من الجلسة.'
    );
  }
}
