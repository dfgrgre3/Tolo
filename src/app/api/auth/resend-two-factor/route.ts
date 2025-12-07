import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { TwoFactorChallengeService } from '@/lib/auth-challenges-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';

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
            return NextResponse.json({ error: 'ط¬ظ„ط³ط© ط؛ظٹط± طµط§ظ„ط­ط©' }, { status: 401 });
         }
         
         // If method is email, we can generate a challenge and send it.
         if (method === 'email') {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const challengeId = await TwoFactorChallengeService.createChallenge(verification.user.id, code);
            
            // Send email (mock for now, or use email service if available)
            logger.info(`Sending 2FA code ${code} to ${verification.user.email}`);
            
            return NextResponse.json({
               success: true,
               message: 'طھظ… ط¥ط±ط³ط§ظ„ ط§ظ„ط±ظ…ط² ط¥ظ„ظ‰ ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ',
               loginAttemptId: challengeId // Return new ID for the challenge
            });
         }
         
         return NextResponse.json({ error: 'ظ„ط§ ظٹظ…ظƒظ† ط¥ط¹ط§ط¯ط© ط¥ط±ط³ط§ظ„ ط§ظ„ط±ظ…ط² ظ„ظ€ TOTP. ط§ط³طھط®ط¯ظ… ط±ظ…ظˆط² ط§ظ„ط§ط³طھط±ط¯ط§ط¯.' }, { status: 400 });
      }

      // It's a UUID (Challenge flow)
      const challenge = await TwoFactorChallengeService.getChallenge(loginAttemptId);
      if (!challenge) {
         return NextResponse.json({ error: 'طھط­ط¯ظٹ ط؛ظٹط± طµط§ظ„ط­' }, { status: 400 });
      }

      if (challenge.used) {
         return NextResponse.json({ error: 'طھظ… ط§ط³طھط®ط¯ط§ظ… ط§ظ„طھط­ط¯ظٹ ط¨ط§ظ„ظپط¹ظ„' }, { status: 400 });
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
         message: 'طھظ… ط¥ط¹ط§ط¯ط© ط¥ط±ط³ط§ظ„ ط§ظ„ط±ظ…ط²',
         loginAttemptId: newChallengeId
      });

    } catch (error) {
      logger.error('Resend error:', error);
      return NextResponse.json({ error: 'ط­ط¯ط« ط®ط·ط£ ظپظٹ ط§ظ„ط®ط§ط¯ظ…' }, { status: 500 });
    }
  });
}
