import { NextRequest, NextResponse } from 'next/server';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { emailService } from '@/lib/services/email-service';
import { prisma } from '@/lib/db';
import { authService } from '@/lib/auth-service';
import { extractRequestMetadata } from '@/app/api/auth/_helpers';
import { z } from 'zod';

const emailSchema = z.string().email('ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ط؛ظٹط± طµط§ظ„ط­').toLowerCase().trim();

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    const { ip, userAgent, clientId } = extractRequestMetadata(req);

    try {
      // Rate limiting check
      try {
        const { RateLimitingService } = await import('@/lib/rate-limiting-service');
        const { getRedisClient } = await import('@/lib/redis');
        
        const redis = await getRedisClient();
        const rateLimitService = new RateLimitingService(redis);
        const rateLimitStatus = await rateLimitService.checkRateLimit(
          `email-verification:${clientId}`,
          {
            windowMs: 15 * 60 * 1000, // 15 minutes
            maxAttempts: 3, // 3 attempts per 15 minutes
            lockoutMs: 30 * 60 * 1000, // 30 minutes lockout
          }
        );

        if (!rateLimitStatus.allowed) {
          const retryAfterSeconds = Math.max(
            1,
            Math.ceil((rateLimitStatus.remainingTime || 900) / 60)
          );

          await authService.logSecurityEvent(null, 'email_verification_rate_limited', ip, {
            userAgent,
            attempts: rateLimitStatus.attempts,
            retryAfterSeconds,
          });

          return NextResponse.json(
            {
              error: 'طھظ… طھط¹ظ„ظٹظ‚ ظ…ط­ط§ظˆظ„ط§طھ ط¥ط±ط³ط§ظ„ ط±ط³ط§ط¦ظ„ ط§ظ„طھط­ظ‚ظ‚ ظ…ط¤ظ‚طھط§ظ‹. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹.',
              code: 'RATE_LIMITED',
              retryAfterSeconds,
            },
            { status: 429 }
          );
        }
      } catch (redisError) {
        // If Redis is unavailable, log but continue
        logger.warn('Redis unavailable for rate limiting:', redisError);
      }

      const body = await req.json();
      const emailValidation = emailSchema.safeParse(body.email);

      if (!emailValidation.success) {
        return NextResponse.json(
          { 
            error: 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ط؛ظٹط± طµط§ظ„ط­',
            code: 'INVALID_EMAIL'
          },
          { status: 400 }
        );
      }

      const email = emailValidation.data;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          emailVerificationToken: true,
          emailVerificationExpires: true,
        },
      });

      if (!user) {
        // Return success even if user not found to prevent enumeration
        await authService.logSecurityEvent(null, 'email_verification_requested_unknown_email', ip, {
          userAgent,
          emailDomain: email.split('@')[1],
        });

        return NextResponse.json({
          message: 'ط¥ط°ط§ ظƒط§ظ† ط¨ط±ظٹط¯ظƒ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ…ط³ط¬ظ„ط§ظ‹ ظ„ط¯ظٹظ†ط§طŒ ط³طھطھظ„ظ‚ظ‰ ط±ط§ط¨ط· ط§ظ„طھط­ظ‚ظ‚.',
        });
      }

      if (user.emailVerified) {
        await authService.logSecurityEvent(user.id, 'email_verification_requested_already_verified', ip, {
          userAgent,
        });

        return NextResponse.json({
          message: 'ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ظ…ظپط¹ظ‘ظ„ ط¨ط§ظ„ظپط¹ظ„.',
          alreadyVerified: true
        });
      }

      // Check if there's a recent verification email sent (within last 2 minutes)
      const recentVerification = user.emailVerificationExpires && 
        user.emailVerificationExpires.getTime() > Date.now() &&
        (Date.now() - (user.emailVerificationExpires.getTime() - 24 * 60 * 60 * 1000)) < 2 * 60 * 1000;

      if (recentVerification) {
        return NextResponse.json({
          message: 'طھظ… ط¥ط±ط³ط§ظ„ ط±ط§ط¨ط· ط§ظ„طھط­ظ‚ظ‚ ظ…ط¤ط®ط±ط§ظ‹. ظٹط±ط¬ظ‰ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط¨ط±ظٹط¯ظƒ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ط£ظˆ ط§ظ„ظ…ط­ط§ظˆظ„ط© ط¨ط¹ط¯ ط¯ظ‚ظٹظ‚طھظٹظ†.',
          code: 'RECENT_EMAIL_SENT',
          canResendAfter: 2 * 60 * 1000, // 2 minutes in milliseconds
        }, { status: 429 });
      }

      // Generate a secure token
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Save token to database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: token,
          emailVerificationExpires: expiresAt,
        },
      });

      // Send verification email with link
      const emailSent = await emailService.sendVerificationEmail(user.email, token);

      if (!emailSent) {
        logger.warn('Failed to send verification email via SMTP (falling back to simulation logs)');
      }

      // Log security event
      await authService.logSecurityEvent(user.id, 'email_verification_sent', ip, {
        userAgent,
        emailSent,
      });

      return NextResponse.json({
        message: 'طھظ… ط¥ط±ط³ط§ظ„ ط±ط§ط¨ط· ط§ظ„طھط­ظ‚ظ‚ ط¨ظ†ط¬ط§ط­. ظٹط±ط¬ظ‰ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط¨ط±ظٹط¯ظƒ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ.',
        expiresIn: 24 * 60 * 60, // 24 hours in seconds
        // In development, return the token for testing
        ...(process.env.NODE_ENV === 'development' && { token }),
      });

    } catch (error) {
      logger.error('Error sending verification email:', error);
      
      await authService.logSecurityEvent(null, 'email_verification_error', ip, {
        userAgent,
        error: error instanceof Error ? error.message : 'Unknown error',
      }).catch(() => {});

      return NextResponse.json(
        { 
          error: 'ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط¥ط±ط³ط§ظ„ ط±ط§ط¨ط· ط§ظ„طھط­ظ‚ظ‚. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹.',
          code: 'INTERNAL_ERROR'
        },
        { status: 500 }
      );
    }
  });
}
