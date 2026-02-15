
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TwoFactorChallengeService } from '@/lib/services/auth-challenges-service';
import { authService } from '@/lib/services/auth-service';
import { securityLogger } from '@/lib/security-logger';
import { setAuthCookies, logSecurityEventSafely, extractRequestMetadata } from '@/lib/auth-utils';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    return opsWrapper(request, async (req) => {
        try {
            const body = await req.json();
            const { loginAttemptId, code, trustDevice } = body;
            const { ip, userAgent } = extractRequestMetadata(req);
            const clientId = `${ip}-${userAgent}`;

            if (!loginAttemptId) {
                return NextResponse.json({ error: 'Login attempt ID is required' }, { status: 400 });
            }
            if (!code) {
                return NextResponse.json({ error: 'Code is required' }, { status: 400 });
            }

            const trimmedCode = code.trim();
            const trimmedAttemptId = loginAttemptId.trim();

            if (trimmedCode.length !== 6 || !/^\d{6}$/.test(trimmedCode)) {
                return NextResponse.json({ error: 'رمز التحقق يجب أن يكون مكون من 6 أرقام', code: 'INVALID_CODE_FORMAT' }, { status: 400 });
            }

            // Lookup challenge to identify user for rate limiting
            const challenge = await prisma.twoFactorChallenge.findUnique({
                where: { id: trimmedAttemptId }
            });

            if (challenge?.userId) {
                try {
                    // Check for persistent lockout first
                    const lockoutStatus = await authService.get2FALockoutStatus(challenge.userId);
                    if (lockoutStatus.locked) {
                        return NextResponse.json(
                            {
                                error: `تم حظر محاولات التحقق مؤقتاً. يمكنك المحاولة مرة أخرى بعد ${lockoutStatus.lockedUntil?.toLocaleTimeString()}`,
                                code: 'ACCOUNT_LOCKED',
                                lockedUntil: lockoutStatus.lockedUntil
                            },
                            { status: 403 }
                        );
                    }

                    // Check user-specific rate limit (e.g. 5 attempts per 15 mins)
                    await authService.checkUserRateLimit(challenge.userId, 5, 15 * 60);
                } catch (error: any) {
                    return NextResponse.json(
                        { error: error.message || 'تم تجاوز الحد المسموح به من المحاولات لهذا الحساب. يرجى الانتظار قليلاً.', code: 'RATE_LIMIT_EXCEEDED' },
                        { status: 429 }
                    );
                }
            }

            // Rate Limit Check (IP based)
            try {
                await authService.checkRateLimit(clientId, 5, 15 * 60);
            } catch (error) {
                return NextResponse.json(
                    { error: 'تم تجاوز الحد المسموح به من المحاولات. يرجى الانتظار قليلاً.', code: 'RATE_LIMIT_EXCEEDED' },
                    { status: 429 }
                );
            }

            // Verify Challenge
            const challengePromise = TwoFactorChallengeService.verifyAndConsumeChallenge(trimmedAttemptId, trimmedCode);
            const timeoutPromise = new Promise<{ valid: false; userId?: string }>((resolve) => setTimeout(() => resolve({ valid: false }), 5000));

            const challengeResult = await Promise.race([challengePromise, timeoutPromise]);

            if (!challengeResult.valid || !challengeResult.userId) {
                // Record failure and check for lockout
                if (challenge?.userId) {
                    await authService.recordFailed2FAAttempt(challenge.userId);
                }

                // Log failure for rate limiting
                await securityLogger.logEvent({
                    userId: challenge?.userId || 'unknown',
                    eventType: 'TWO_FACTOR_FAILED',
                    ip,
                    userAgent,
                    metadata: { reason: 'invalid_code', loginAttemptId: trimmedAttemptId }
                });

                return NextResponse.json({ error: 'رمز التحقق غير صحيح أو منتهي الصلاحية', code: 'INVALID_OR_EXPIRED' }, { status: 400 });
            }

            // On success, reset attempts
            await authService.reset2FAAttempts(challengeResult.userId);

            // Fetch user
            const user = await prisma.user.findUnique({
                where: { id: challengeResult.userId },
                select: {
                    id: true, email: true, name: true, role: true, twoFactorEnabled: true, lastLogin: true
                }
            });

            if (!user) {
                return NextResponse.json({ error: 'المستخدم غير موجود', code: 'USER_NOT_FOUND' }, { status: 404 });
            }

            const rememberDevice = Boolean(trustDevice);
            await authService.resetRateLimit(clientId);

            // Create Session & Tokens
            const tempTokens = await authService.createTokens({
                id: user.id, email: user.email, name: user.name || undefined, role: user.role || undefined
            });

            const session = await authService.createSession(user.id, tempTokens.refreshToken, userAgent, ip, rememberDevice);

            const { accessToken, refreshToken } = await authService.createTokens({
                id: user.id, email: user.email, name: user.name || undefined, role: user.role || undefined
            }, session.id);

            await prisma.session.update({ where: { id: session.id }, data: { refreshToken } });

            // Update user & Log
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() }
            });

            logSecurityEventSafely(user.id, 'two_factor_verified', { userAgent, sessionId: session.id, ip });

            const response = NextResponse.json({
                message: 'تم التحقق من الرمز بنجاح.',
                user: { ...user, emailVerified: false }, // emailVerified not in select, safe to assume false or handle otherwise
                token: accessToken,
                refreshToken,
                sessionId: session.id
            });

            setAuthCookies(response, accessToken, refreshToken, rememberDevice);
            return response;

        } catch (error) {
            logger.error('TOTP verify login error:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    });
}
