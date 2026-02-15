import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TwoFactorChallengeService } from '@/lib/services/auth-challenges-service';
import { authService } from '@/lib/services/auth-service';
import { securityLogger } from '@/lib/security-logger';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { extractRequestMetadata, createErrorResponse } from '@/lib/auth-utils';
import { rateLimitingService } from '@/lib/services/rate-limiting-service';
import { TokenService } from '@/lib/services/token-service';

export async function POST(request: NextRequest) {
    return opsWrapper(request, async (req) => {
        try {
            const body = await req.json();
            // Added type safety by checking if body is null or undefined
            if (!body) {
                return NextResponse.json({ error: 'Missing request body' }, { status: 400 });
            }

            const { loginAttemptId, code, trustDevice } = body;
            const { ip, userAgent, clientId } = extractRequestMetadata(req);

            if (!loginAttemptId || !code) {
                return NextResponse.json({ error: 'Missing loginAttemptId or code' }, { status: 400 });
            }

            const trimmedCode = code.trim();
            const trimmedAttemptId = loginAttemptId.trim();

            if (trimmedCode.length !== 6 || !/^\d{6}$/.test(trimmedCode)) {
                return NextResponse.json({ error: 'رمز التحقق يجب أن يكون مكون من 6 أرقام', code: 'INVALID_CODE_FORMAT' }, { status: 400 });
            }

            // Lookup challenge
            const challenge = await prisma.twoFactorChallenge.findUnique({
                where: { id: trimmedAttemptId }
            });

            if (challenge?.userId) {
                // Check user rate limit
                const userRateLimit = await rateLimitingService.checkRateLimit(`user:${challenge.userId}`, {
                    maxAttempts: 5,
                    windowMs: 15 * 60 * 1000
                });

                if (!userRateLimit.allowed) {
                    return NextResponse.json(
                        {
                            error: userRateLimit.lockedUntil
                                ? `تم حظر محاولات التحقق مؤقتاً.`
                                : 'تم تجاوز الحد المسموح به من المحاولات.',
                            code: 'RATE_LIMIT_EXCEEDED'
                        },
                        { status: 429 }
                    );
                }
            }

            // Check IP rate limit
            const ipRateLimit = await rateLimitingService.checkRateLimit(clientId, {
                maxAttempts: 5,
                windowMs: 15 * 60 * 1000
            });

            if (!ipRateLimit.allowed) {
                return NextResponse.json(
                    { error: 'تم تجاوز الحد المسموح به من المحاولات.', code: 'RATE_LIMIT_EXCEEDED' },
                    { status: 429 }
                );
            }

            // Verify Challenge
            const challengePromise = TwoFactorChallengeService.verifyAndConsumeChallenge(trimmedAttemptId, trimmedCode);
            const timeoutPromise = new Promise<{ valid: false }>((resolve) => setTimeout(() => resolve({ valid: false }), 5000));

            const challengeResult = await Promise.race([challengePromise, timeoutPromise]);

            if (!challengeResult.valid || !challengeResult.userId) {
                if (challenge?.userId) {
                    await rateLimitingService.incrementAttempts(`user:${challenge.userId}`);
                }
                await rateLimitingService.incrementAttempts(clientId);

                await securityLogger.logEvent({
                    userId: challenge?.userId || 'unknown',
                    eventType: 'TWO_FACTOR_FAILED',
                    ip,
                    userAgent,
                    metadata: { reason: 'invalid_code', loginAttemptId: trimmedAttemptId }
                });
                return NextResponse.json({ error: 'رمز التحقق غير صحيح أو منتهي الصلاحية', code: 'INVALID_OR_EXPIRED' }, { status: 400 });
            }

            // Reset attempts
            await rateLimitingService.resetAttempts(`user:${challengeResult.userId}`);
            await rateLimitingService.resetAttempts(clientId);

            // Fetch user
            const user = await prisma.user.findUnique({
                where: { id: challengeResult.userId }
            });

            if (!user) {
                return NextResponse.json({ error: 'المستخدم غير موجود', code: 'USER_NOT_FOUND' }, { status: 404 });
            }

            // Complete Login using TokenService
            // Assuming low risk for verified 2FA, but ideally should carry over risk from first step
            // or re-assess. For now, we assume safe.
            const loginResult = await TokenService.completeLogin(
                {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role || 'user',
                    emailVerified: user.emailVerified || false,
                    twoFactorEnabled: user.twoFactorEnabled || false,
                    lastLogin: user.lastLogin
                },
                userAgent,
                ip,
                { level: 'low', score: 0, factors: {}, blockAccess: false, requireAdditionalAuth: false },
                !trustDevice, // Treat as new device if not trusted? Or simply isNewDevice=false (assuming checked earlier)
                false, // accountWasCreated
                clientId
            );

            // TokenService.completeLogin returns { success: true, response: LoginResponse, ... }
            // We return the response JSON directly.
            if (loginResult.success) {
                // Need to set cookies. completeLogin doesn't set cookies on the response object it generates?
                // It returns a LoginResponse object. It does NOT return NextResponse.
                // Wait, `createLoginSuccessResponse` returns a plain object.
                // I need to create NextResponse and set cookies.
                // TokenService.completeLogin logic ends with returning the object.
                // I should handle cookie setting here.

                const loginResponse = loginResult.response as any; // Type assertion if needed

                const response = NextResponse.json(loginResponse);

                // Import setAuthCookies
                const { setAuthCookies } = await import('@/lib/auth-utils');
                setAuthCookies(response, loginResponse.token, loginResponse.refreshToken, !!trustDevice);

                return response;
            } else {
                return NextResponse.json(loginResult.response || { error: 'Login failed' }, { status: loginResult.statusCode });
            }

        } catch (error) {
            logger.error('Two-factor login verification error:', error);
            return createErrorResponse(error, 'حدث خطأ غير متوقع.');
        }
    });
}
