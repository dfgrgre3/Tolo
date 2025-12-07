import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authService } from '@/lib/auth-service';
import { isConnectionError } from '@/app/api/auth/_helpers';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

const tokenParamSchema = z.string().min(1, 'ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚ ظ…ط·ظ„ظˆط¨');

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    const ip = authService.getClientIP(req);
    const userAgent = authService.getUserAgent(req);

    try {
      const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚ ظ…ظپظ‚ظˆط¯.',
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
          error: 'ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚ ط؛ظٹط± طµط§ظ„ط­.',
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
      logger.error('Database error while finding user:', dbError);
      
      if (isConnectionError(dbError)) {
        return NextResponse.json(
          {
            success: false,
            error: 'ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„: ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„ط§طھطµط§ظ„ ط¨ط§ظ„ط®ط§ط¯ظ…. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹.',
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
          error: 'ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚ ط؛ظٹط± طµط§ظ„ط­ ط£ظˆ طھظ… ط§ط³طھط®ط¯ط§ظ…ظ‡ ظ…ط³ط¨ظ‚ط§ظ‹.',
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
        message: 'طھظ… طھظپط¹ظٹظ„ ط§ظ„ط¨ط±ظٹط¯ ظ…ط³ط¨ظ‚ط§ظ‹طŒ ظٹظ…ظƒظ†ظƒ ظ…طھط§ط¨ط¹ط© ط§ط³طھط®ط¯ط§ظ… ط§ظ„ط­ط³ط§ط¨.',
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
          error: 'ط§ظ†طھظ‡طھ طµظ„ط§ط­ظٹط© ط±ط§ط¨ط· ط§ظ„طھظپط¹ظٹظ„. ظٹط±ط¬ظ‰ ط·ظ„ط¨ ط±ط§ط¨ط· ط¬ط¯ظٹط¯ ظ…ظ† طµظپط­ط© ط§ظ„ط­ط³ط§ط¨.',
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
      logger.error('Database error while updating user:', dbError);
      
      if (isConnectionError(dbError)) {
        return NextResponse.json(
          {
            success: false,
            error: 'ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„: ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„ط§طھطµط§ظ„ ط¨ط§ظ„ط®ط§ط¯ظ…. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹.',
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
      message: 'طھظ… طھظپط¹ظٹظ„ ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ط¨ظ†ط¬ط§ط­.',
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    
    // Log security event safely
    try {
      await authService.logSecurityEvent(null, 'email_verification_error', ip, {
        userAgent,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      logger.error('Failed to log security event:', logError);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'ط­ط¯ط« ط®ط·ط£ ط؛ظٹط± ظ…طھظˆظ‚ط¹ ط£ط«ظ†ط§ط، ط§ظ„طھظپط¹ظٹظ„.',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
    }
  });
}
