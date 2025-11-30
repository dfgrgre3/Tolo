import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { TwoFactorChallengeService } from '@/lib/auth-challenges-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { loginAttemptId, method } = await req.json();

      if (!loginAttemptId) {
        return NextResponse.json({ error: 'Missing loginAttemptId' }, { status: 400 });
      }

      // Check if it's a JWT (TOTP flow)
      // JWTs have 3 parts separated by dots
      if (loginAttemptId.split('.').length === 3) {
         // It's a JWT. Verify it.
         const verification = await authService.verifyTokenFromInput(loginAttemptId);
         if (!verification.isValid || !verification.user) {
            return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 });
         }
         
         // If method is email, we can generate a challenge and send it.
         if (method === 'email') {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const challengeId = await TwoFactorChallengeService.createChallenge(verification.user.id, code);
            
            // Send email (mock for now, or use email service if available)
            logger.info(`Sending 2FA code ${code} to ${verification.user.email}`);
            
            return NextResponse.json({
               success: true,
               message: 'تم إرسال الرمز إلى البريد الإلكتروني',
               loginAttemptId: challengeId // Return new ID for the challenge
            });
         }
         
         return NextResponse.json({ error: 'لا يمكن إعادة إرسال الرمز لـ TOTP. استخدم رموز الاسترداد.' }, { status: 400 });
      }

      // It's a UUID (Challenge flow)
      const challenge = await TwoFactorChallengeService.getChallenge(loginAttemptId);
      if (!challenge) {
         return NextResponse.json({ error: 'تحدي غير صالح' }, { status: 400 });
      }

      if (challenge.used) {
         return NextResponse.json({ error: 'تم استخدام التحدي بالفعل' }, { status: 400 });
      }

      // Generate new code
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      const newChallengeId = await TwoFactorChallengeService.createChallenge(challenge.userId!, newCode);

      // Send email
      const user = await prisma.user.findUnique({ where: { id: challenge.userId! } });
      if (user) {
         logger.info(`Resending 2FA code ${newCode} to ${user.email}`);
      }

      return NextResponse.json({
         success: true,
         message: 'تم إعادة إرسال الرمز',
         loginAttemptId: newChallengeId
      });

    } catch (error) {
      logger.error('Resend error:', error);
      return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
    }
  });
}
