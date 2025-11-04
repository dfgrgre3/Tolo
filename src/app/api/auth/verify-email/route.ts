import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authService } from '@/lib/auth-service';
import { isConnectionError } from '../_helpers';

const tokenParamSchema = z.string().min(1, 'رمز التحقق مطلوب');

export async function GET(request: NextRequest) {
  const ip = authService.getClientIP(request);
  const userAgent = authService.getUserAgent(request);

  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'رمز التحقق مفقود.',
          code: 'TOKEN_MISSING',
        },
        { status: 400 }
      );
    }

    // Validate token format
    const tokenValidation = tokenParamSchema.safeParse(token);
    if (!tokenValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'رمز التحقق غير صالح.',
          code: 'INVALID_TOKEN_FORMAT',
        },
        { status: 400 }
      );
    }

    // Find user with verification token
    let user;
    try {
      user = await prisma.user.findFirst({
        where: { emailVerificationToken: token },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          emailVerificationToken: true,
          emailVerificationExpires: true,
        },
      });
    } catch (dbError) {
      console.error('Database error while finding user:', dbError);
      
      if (isConnectionError(dbError)) {
        return NextResponse.json(
          {
            success: false,
            error: 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقاً.',
            code: 'CONNECTION_ERROR',
          },
          { status: 503 }
        );
      }
      
      throw dbError;
    }

    if (!user) {
      // Log failed attempt for security monitoring
      await authService.logSecurityEvent(null, 'email_verification_invalid_token', ip, {
        userAgent,
        tokenLength: token.length,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'رمز التحقق غير صالح أو تم استخدامه مسبقاً.',
          code: 'INVALID_OR_USED_TOKEN',
        },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      await authService.logSecurityEvent(user.id, 'email_verification_already_verified', ip, {
        userAgent,
      });

      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: 'تم تفعيل البريد مسبقاً، يمكنك متابعة استخدام الحساب.',
      });
    }

    // Check if token expired
    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires.getTime() < Date.now()
    ) {
      await authService.logSecurityEvent(user.id, 'email_verification_expired', ip, {
        userAgent,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'انتهت صلاحية رابط التفعيل. يرجى طلب رابط جديد من صفحة الحساب.',
          code: 'TOKEN_EXPIRED',
        },
        { status: 410 }
      );
    }

    // Update user to mark email as verified
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
          updatedAt: new Date(),
        },
      });
    } catch (dbError) {
      console.error('Database error while updating user:', dbError);
      
      if (isConnectionError(dbError)) {
        return NextResponse.json(
          {
            success: false,
            error: 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقاً.',
            code: 'CONNECTION_ERROR',
          },
          { status: 503 }
        );
      }
      
      throw dbError;
    }

    // Log successful verification
    await authService.logSecurityEvent(user.id, 'email_verification_success', ip, {
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: 'تم تفعيل البريد الإلكتروني بنجاح.',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    
    // Log security event safely
    try {
      await authService.logSecurityEvent(null, 'email_verification_error', ip, {
        userAgent,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ غير متوقع أثناء التفعيل.',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
