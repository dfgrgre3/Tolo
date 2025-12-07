import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLink } from '@/lib/passwordless/magic-link-service';
import { authService } from '@/lib/auth-service';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/magic-link/verify
 * ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط±ط§ط¨ط· ط³ط­ط±ظٹ ظˆطھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„
 */
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json();
      const { token, email } = body;

      if (!token || !email) {
        return NextResponse.json(
          { error: 'ط§ظ„ط±ظ…ط² ظˆط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ…ط·ظ„ظˆط¨ط§ظ†' },
          { status: 400 }
        );
      }

      const ip = authService.getClientIP(req);
      const userAgent = authService.getUserAgent(req);

      const result = await verifyMagicLink(token, email, ip, userAgent);

      if (!result.valid || !result.user) {
        // Log failed verification attempt
        await authService.logSecurityEvent(null, 'magic_link_verification_failed', ip, {
          userAgent,
          email,
        }).catch(() => {
          // Non-blocking log failure
        });

        return NextResponse.json(
          { error: result.error || 'ط§ظ„ط±ط§ط¨ط· ط؛ظٹط± طµط§ظ„ط­ ط£ظˆ ظ…ظ†طھظ‡ظٹ ط§ظ„طµظ„ط§ط­ظٹط©' },
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
          { error: 'ط§ظ„ظ…ط³طھط®ط¯ظ… ط؛ظٹط± ظ…ظˆط¬ظˆط¯' },
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
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: (user as any).role || 'user',
      });

      // Create session
      const session = await authService.createSession(user.id, userAgent, ip, tempTokens.refreshToken);

      // Create final tokens with session ID
      const { accessToken, refreshToken } = await authService.createTokens(
        {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: (user as any).role || 'user',
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
        message: 'طھظ… طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط¨ظ†ط¬ط§ط­',
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
        { error: 'ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط±ط§ط¨ط· طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„' },
        { status: 500 }
      );
    }
  });
}

