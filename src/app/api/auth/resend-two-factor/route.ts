import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { TwoFactorChallengeService } from '@/lib/services/auth-challenges-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import { createErrorResponse, createSuccessResponse, parseRequestBody } from '@/app/api/auth/_helpers';

export async function POST(request: NextRequest) {
   return opsWrapper(request, async (req) => {
      try {
         const bodyResult = await parseRequestBody<{
            loginAttemptId: string;
            method?: string;
         }>(req, { required: true });

         if (!bodyResult.success) {
            return bodyResult.error;
         }

         const { loginAttemptId, method } = bodyResult.data;

         if (!loginAttemptId) {
            return createErrorResponse('Missing loginAttemptId', '„⁄—› «·„Õ«Ê·… „›ﬁÊœ', 400);
         }

         // Check if it's a JWT (TOTP flow)
         // JWTs have 3 parts separated by dots
         if (loginAttemptId.split('.').length === 3) {
            // It's a JWT. Verify it.
            const verification = await authService.verifyTokenFromInput(loginAttemptId);
            if (!verification.isValid || !verification.user) {
               return createErrorResponse('Ã·”… €Ì— ’«·Õ…', 'Ã·”… €Ì— ’«·Õ…', 401);
            }

            // If method is email, we can generate a challenge and send it.
            if (method === 'email') {
               const code = Math.floor(100000 + Math.random() * 900000).toString();
               const challengeId = await TwoFactorChallengeService.createChallenge(verification.user.id, code);

               // Send email (mock for now, or use email service if available)
               logger.info(`Sending 2FA code ${code} to ${verification.user.email}`);

               return createSuccessResponse({
                  loginAttemptId: challengeId // Return new ID for the challenge
               }, ' „ ≈—”«· «·—„“ ≈·Ï «·»—Ìœ «·≈·ﬂ —Ê‰Ì');
            }

            return createErrorResponse(
               '·« Ì„ﬂ‰ ≈⁄«œ… ≈—”«· «·—„“ ·‹ TOTP. «” Œœ„ —„Ê“ «·«” —œ«œ.',
               '·« Ì„ﬂ‰ ≈⁄«œ… ≈—”«· «·—„“ ·‹ TOTP. «” Œœ„ —„Ê“ «·«” —œ«œ.',
               400
            );
         }

         // It's a UUID (Challenge flow)
         const challenge = await TwoFactorChallengeService.getChallenge(loginAttemptId);
         if (!challenge) {
            return createErrorResponse(' ÕœÌ €Ì— ’«·Õ', ' ÕœÌ €Ì— ’«·Õ', 400);
         }

         if (challenge.used) {
            return createErrorResponse(' „ «” Œœ«„ «· ÕœÌ »«·›⁄·', ' „ «” Œœ«„ «· ÕœÌ »«·›⁄·', 400);
         }

         // Generate new code
         const newCode = Math.floor(100000 + Math.random() * 900000).toString();
         const newChallengeId = await TwoFactorChallengeService.createChallenge(challenge.userId!, newCode);

         // Send email
         const user = await prisma.user.findUnique({ where: { id: challenge.userId! } });
         if (user) {
            logger.info(`Resending 2FA code ${newCode} to ${user.email}`);
         }

         return createSuccessResponse({
            loginAttemptId: newChallengeId
         }, ' „ ≈⁄«œ… ≈—”«· «·—„“');

      } catch (error) {
         logger.error('Resend error:', error);
         return createErrorResponse(error, 'ÕœÀ Œÿ√ ›Ì «·Œ«œ„', 500);
      }
   });
}
