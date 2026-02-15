import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLink } from '@/lib/passwordless/magic-link-service';
import { authService } from '@/lib/services/auth-service';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/magic-link/verify
 * التحقق من رابط سحري وتسجيل الدخول
 */
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json();
      const { token, email } = body;

      if (!token || !email) {
        return NextResponse.json(
          { error: 'الرمز والبريد الإلكتروني مطلوبان' },
          { status: 400 }
        );
      }

      const ip = authService.getClientIP(req);
      const userAgent = authService.getUserAgent(req);

      const result = await verifyMagicLink(token, email, ip, userAgent);

      if (!result.valid || !result.user) {
        // Log failed verification attempt
        await authService.logSecurityEvent('unknown', 'magic_link_invalid', ip, { userAgent, reason: result.error || 'unknown_reason', email }).catch(() => {
          // Non-blocking log failure
        });

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

      // Create tokens first to get a refresh token
      const tempTokens = await authService.createTokens({
        userId: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role || 'user',
      });

      // Create session
      const session = await authService.createSession(user.id, tempTokens.refreshToken, userAgent, ip);

      // Create final tokens with session ID
      const { accessToken, refreshToken } = await authService.createTokens(
        {
          userId: user.id,
          email: user.email,
          name: user.name || undefined,
          role: user.role || 'user',
        },
        session.id
      );

      // Update session with final refresh token
      await prisma.session.update({
        where: { id: session.id },
        data: { refreshToken }
      });

      // Log successful magic link login (additional to the one in verifyMagicLink)
      await authService.logSecurityEvent(user.id, 'magic_link_login_success', ip, {
        userAgent,
        sessionId: session.id,
      }).catch(() => {
        // Non-blocking log failure
      });

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
      logger.error('Magic link verify error:', error);
      return NextResponse.json(
        { error: 'حدث خطأ أثناء التحقق من رابط تسجيل الدخول' },
        { status: 500 }
      );
    }
  });
}

