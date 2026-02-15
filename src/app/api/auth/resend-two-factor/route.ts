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
                return createErrorResponse('Missing loginAttemptId', 'معرف المحاولة مفقود', 400);
            }

            // Check if it's a JWT (TOTP flow)
            // JWTs have 3 parts separated by dots
            if (loginAttemptId.split('.').length === 3) {
                // It's a JWT. Verify it.
                const verification = await authService.verifyTokenFromInput(loginAttemptId);
                if (!verification.isValid || !verification.user) {
                    return createErrorResponse('Invalid session', 'جلسة غير صالحة', 401);
                }

                // If method is email, we can generate a challenge and send it.
                if (method === 'email') {
                    const code = Math.floor(100000 + Math.random() * 900000).toString();
                    const challengeId = await TwoFactorChallengeService.createChallenge(verification.user.userId, code);

                    // Send email (mock for now, or use email service if available)
                    logger.info(`Sending 2FA code to ${verification.user.email}`);

                    return createSuccessResponse({
                        loginAttemptId: challengeId
                    }, 'Code sent to email');
                }

                return createErrorResponse(
                    'Cannot resend code for TOTP. Use recovery codes.',
                    'Cannot resend code for TOTP. Use recovery codes.',
                    400
                );
            }

            // It's a UUID (Challenge flow)
            const challenge = await TwoFactorChallengeService.getChallenge(loginAttemptId);
            if (!challenge) {
                return createErrorResponse('Invalid challenge', 'Invalid challenge', 400);
            }

            if (challenge.used) {
                return createErrorResponse('Challenge already used', 'Challenge already used', 400);
            }

            // Generate new code
            const newCode = Math.floor(100000 + Math.random() * 900000).toString();
            const newChallengeId = await TwoFactorChallengeService.createChallenge(challenge.userId!, newCode);

            // Send email
            const user = await prisma.user.findUnique({ where: { id: challenge.userId! } });
            if (user) {
                logger.info(`Resending 2FA code to ${user.email}`);
            }

            return createSuccessResponse({
                loginAttemptId: newChallengeId
            }, 'Code resent successfully');

        } catch (error) {
            logger.error('Resend error:', error);
            return createErrorResponse(error, 'Server error', 500);
        }
    });
}
