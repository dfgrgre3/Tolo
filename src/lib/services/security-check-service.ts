import { logger } from '@/lib/logger';
import { authService } from '@/lib/services/auth-service';
import { captchaService } from '@/lib/security/captcha-service';
import { createCaptchaRequiredResponse } from '@/app/api/auth/_helpers';
import type { LoginResult } from '@/lib/services/login-service';
import type { LoginErrorResponse } from '@/types/api/auth';
import type { RateLimitService, RateLimitResult } from '@/types/services';

export interface RateLimitConfig {
    windowMs: number;
    maxAttempts: number;
    lockoutMs: number;
}

export class SecurityCheckService {
    /**
     * Initialize rate limiting service
     */
    static async initializeRateLimitService(clientId: string): Promise<{
        rateLimitService: RateLimitService | null;
        rateLimitStatus: RateLimitResult;
    }> {
        if (!clientId) {
            return {
                rateLimitService: null,
                rateLimitStatus: { allowed: true, attempts: 0 },
            };
        }

        try {
            // Add timeout to prevent hanging on Redis connection
            const timeoutPromise = new Promise<{ rateLimitService: RateLimitService | null; rateLimitStatus: RateLimitResult }>((resolve) => {
                setTimeout(() => {
                    resolve({
                        rateLimitService: null,
                        rateLimitStatus: { allowed: true, attempts: 0 },
                    });
                }, 500); // 500ms timeout - faster fallback when Redis unavailable
            });

            const initPromise = (async () => {
                const { RateLimitingService } = await import('@/lib/services/rate-limiting-service');
                const { getRedisClient } = await import('@/lib/redis');

                const redis = await getRedisClient();
                const rateLimitService = new RateLimitingService(redis);
                const rateLimitStatus = await rateLimitService.checkRateLimit(clientId);

                return { rateLimitService, rateLimitStatus };
            })();

            return await Promise.race([initPromise, timeoutPromise]);
        } catch (redisError) {
            logger.warn('Redis unavailable, proceeding without rate limiting:', redisError);
            return {
                rateLimitService: null,
                rateLimitStatus: { allowed: true, attempts: 0 },
            };
        }
    }

    /**
     * Check IP blocking
     */
    static async checkIPBlocking(ip: string): Promise<LoginResult | null> {
        try {
            const { ipBlockingService } = await import('@/lib/security/ip-blocking');
            const ipBlockStatus = ipBlockingService.isBlocked(ip);

            if (ipBlockStatus.blocked) {
                await authService.logSecurityEvent(null, 'login_blocked_ip', ip, {
                    reason: ipBlockStatus.reason,
                    blockedUntil: ipBlockStatus.blockedUntil?.toISOString(),
                });

                return {
                    success: false,
                    response: {
                        error: `تم حظر عنوان IP هذا بسبب محاولات غير مصرح بها. السبب: ${ipBlockStatus.reason}`,
                        code: 'IP_BLOCKED',
                        blockedUntil: ipBlockStatus.blockedUntil?.toISOString(),
                    },
                    statusCode: 403,
                };
            }
        } catch (ipBlockError) {
            // Enhanced error logging with context
            logger.warn('IP blocking check failed', {
                ip: ip.substring(0, 10) + '***', // Partially mask IP for privacy
                error: ipBlockError instanceof Error ? ipBlockError.message : 'Unknown error',
                stack: process.env.NODE_ENV === 'development' && ipBlockError instanceof Error
                    ? ipBlockError.stack
                    : undefined,
            });
            // Fail open - don't block login if IP check fails
        }

        return null;
    }

    /**
     * Check rate limiting
     */
    static async checkRateLimiting(
        rateLimitStatus: RateLimitResult,
        ip: string,
        userAgent: string
    ): Promise<LoginResult | null> {
        if (!rateLimitStatus.allowed) {
            const now = Date.now();
            const lockoutUntil = rateLimitStatus.lockedUntil ?? 0;
            const retryMs = lockoutUntil > now
                ? lockoutUntil - now
                : (rateLimitStatus.remainingTime ?? 0) * 60 * 1000;
            const retryAfterSeconds = Math.max(1, Math.ceil((retryMs || 60000) / 1000));

            // Record suspicious IP activity
            try {
                const { ipBlockingService } = await import('@/lib/security/ip-blocking');
                ipBlockingService.recordFailedAttempt(ip, 'Rate limit exceeded');
            } catch (ipBlockError) {
                // Ignore IP blocking errors
            }

            await authService.logSecurityEvent(null, 'login_rate_limited', ip, {
                userAgent,
                attempts: rateLimitStatus.attempts,
                retryAfterSeconds,
                lockedUntil: lockoutUntil ? new Date(lockoutUntil).toISOString() : undefined,
            });

            return {
                success: false,
                response: {
                    error: 'تم تعليق محاولات تسجيل الدخول مؤقتاً بسبب محاولات متكررة. يمكنك المحاولة مرة أخرى بعد انتهاء العد التنازلي.',
                    code: 'RATE_LIMITED',
                    retryAfterSeconds,
                    lockedUntil: lockoutUntil ? new Date(lockoutUntil).toISOString() : undefined,
                    attempts: rateLimitStatus.attempts,
                },
                statusCode: 429,
            };
        }

        return null;
    }

    /**
     * Check CAPTCHA requirement and verify
     */
    static async checkCaptcha(
        currentAttempts: number,
        captchaToken: string | undefined,
        ip: string,
        email: string
    ): Promise<LoginResult | null> {
        if (captchaService.shouldRequireCaptcha(currentAttempts)) {
            if (!captchaToken) {
                return {
                    success: false,
                    response: {
                        error: 'يرجى إكمال التحقق من CAPTCHA للمتابعة. تم اكتشاف محاولات تسجيل دخول متكررة.',
                        requiresCaptcha: true,
                        failedAttempts: currentAttempts,
                        code: 'CAPTCHA_REQUIRED',
                    },
                    statusCode: 403,
                };
            }

            // Verify CAPTCHA token
            const isValidCaptcha = await captchaService.verifyCaptcha(captchaToken, ip);
            if (!isValidCaptcha) {
                await authService.logSecurityEvent(null, 'captcha_verification_failed', ip, {
                    email,
                });

                return {
                    success: false,
                    response: {
                        error: 'فشل التحقق من CAPTCHA. يرجى المحاولة مرة أخرى.',
                        requiresCaptcha: true,
                        failedAttempts: currentAttempts,
                        code: 'CAPTCHA_INVALID',
                    },
                    statusCode: 403,
                };
            }
        }

        return null;
    }

    /**
     * Get updated failed attempts count
     */
    static async getUpdatedAttempts(
        rateLimitService: RateLimitService | null,
        clientId: string
    ): Promise<number> {
        if (!rateLimitService || !clientId) {
            return 1;
        }

        try {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise<number>((resolve) => {
                setTimeout(() => resolve(1), 500); // 500ms timeout - faster response
            });

            const rateLimitPromise = rateLimitService.checkRateLimit(clientId)
                .then((status: RateLimitResult) => (status?.attempts || 0) + 1)
                .catch(() => 1);

            const attempts = await Promise.race([rateLimitPromise, timeoutPromise]);
            return attempts;
        } catch (redisError) {
            logger.warn('Redis unavailable for rate limit check:', redisError);
            return 1;
        }
    }

    /**
     * Handle failed login attempt
     */
    static async handleFailedLogin(
        clientId: string,
        userId: string | null,
        ip: string,
        userAgent: string,
        reason: string,
        email: string,
        rateLimitService: RateLimitService | null
    ): Promise<LoginResult> {
        // Execute security operations in parallel for better performance
        const securityOperations = Promise.allSettled([
            // Record failed attempt (non-blocking)
            authService.recordFailedAttempt(clientId).catch((err) => {
                logger.warn('Failed to record failed attempt:', err);
            }),

            // Record IP-based failed attempt (non-blocking)
            import('@/lib/security/ip-blocking')
                .then(({ ipBlockingService }) =>
                    ipBlockingService.recordFailedAttempt(ip, `Failed login: ${reason}`)
                )
                .catch((ipBlockError) => {
                    // Ignore IP blocking errors silently
                    if (process.env.NODE_ENV === 'development') {
                        logger.debug('IP blocking service unavailable:', ipBlockError);
                    }
                }),

            // Log security event (non-blocking)
            authService.logSecurityEvent(userId, 'login_failed', ip, {
                userAgent,
                reason,
                email: userId ? undefined : email,
            }).catch((logError) => {
                logger.warn('Failed to log security event:', logError);
            }),
        ]);

        // Don't wait for security operations to complete
        securityOperations.catch(() => {
            // Silent fail - security logging shouldn't block login response
        });

        // Get updated failed attempts count (with timeout)
        const updatedAttempts = await this.getUpdatedAttempts(rateLimitService, clientId);

        // Require CAPTCHA after threshold failed attempts
        if (captchaService.shouldRequireCaptcha(updatedAttempts)) {
            const captchaResponse = createCaptchaRequiredResponse(updatedAttempts, 401);
            // Extract the JSON body from NextResponse
            const responseBody = await captchaResponse.json();
            return {
                success: false,
                response: responseBody as LoginErrorResponse,
                statusCode: 401,
            };
        }

        return {
            success: false,
            response: {
                error: 'بيانات تسجيل الدخول غير صحيحة.',
                code: 'INVALID_CREDENTIALS',
            },
            statusCode: 401,
        };
    }
}
