import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLink } from '@/lib/passwordless/magic-link-service';
import { authService } from '@/lib/auth-service';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/auth/magic-link/verify
 * التحقق من رابط سحري وتسجيل الدخول
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email } = body;

    if (!token || !email) {
      return NextResponse.json(
        { error: 'الرمز والبريد الإلكتروني مطلوبان' },
        { status: 400 }
      );
    }

    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);

    const result = await verifyMagicLink(token, email, ip, userAgent);

    if (!result.valid || !result.user) {
      return NextResponse.json(
        { error: result.error || 'الرابط غير صالح أو منتهي الصلاحية' },
        { status: 400 }
      );
    }

    // Get full user data
    const user = await prisma.user.findUnique({
      where: { id: result.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        twoFactorEnabled: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create session
    const session = await authService.createSession(user.id, userAgent, ip);
    const { accessToken, refreshToken } = await authService.createTokens(
      {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: (user as any).role || 'user',
      },
      session.id
    );

    return NextResponse.json({
      message: 'تم تسجيل الدخول بنجاح',
      token: accessToken,
      refreshToken,
      sessionId: session.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: (user as any).role || 'user',
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('Magic link verify error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء التحقق من رابط تسجيل الدخول' },
      { status: 500 }
    );
  }
}

