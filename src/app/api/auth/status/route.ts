import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { withAuth } from '@/lib/middleware/auth-middleware';
import { prisma } from '@/lib/prisma';
import { isConnectionError } from '../_helpers';

/**
 * GET /api/auth/status
 * 
 * تحقق من حالة المصادقة الحالية للمستخدم
 * يعيد معلومات أساسية عن حالة الجلسة بدون كشف معلومات حساسة
 * 
 * Response:
 * - authenticated: boolean - هل المستخدم مسجل دخول
 * - user: { id, email, name, role } - معلومات المستخدم الأساسية
 * - sessionId: string - معرف الجلسة
 * - expiresAt: string - تاريخ انتهاء الجلسة
 * - twoFactorEnabled: boolean - هل تم تفعيل المصادقة بخطوتين
 * - emailVerified: boolean - هل تم التحقق من البريد الإلكتروني
 */
export async function GET(request: NextRequest) {
  try {
    // Use auth middleware to verify authentication
    const authResult = await withAuth(request, {
      requireAuth: false, // Don't require auth, just check if exists
      checkSession: true,
    });

    // If not authenticated, return unauthenticated status
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({
        authenticated: false,
        message: 'المستخدم غير مسجل دخول',
      });
    }

    const { user, sessionId } = authResult;

    // Get session expiry if session ID exists
    let expiresAt: Date | null = null;
    if (sessionId) {
      try {
        const session = await authService.getSession(sessionId);
        if (session) {
          expiresAt = session.expiresAt;
        }
      } catch (sessionError) {
        // Log but don't fail - session might be expired
        console.warn('Failed to get session expiry:', sessionError);
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
      console.error('Database error while fetching user details:', dbError);
      
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
          warning: 'حدث خطأ في الاتصال بقاعدة البيانات',
        });
      }
      
      throw dbError;
    }

    if (!userDetails) {
      return NextResponse.json(
        {
          authenticated: false,
          error: 'تعذر العثور على حساب المستخدم.',
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
    console.error('Auth status check error:', error);
    
    // Return error response
    return NextResponse.json(
      {
        authenticated: false,
        error: 'حدث خطأ أثناء التحقق من حالة المصادقة.',
        code: 'STATUS_CHECK_ERROR',
      },
      { status: 500 }
    );
  }
}

