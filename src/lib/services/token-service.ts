import { authService } from '@/lib/services/auth-service';
import { prisma } from '@/lib/db';
import { Session } from '@prisma/client';
import { logger } from '@/lib/logger';
import type { LoginResult } from '@/lib/services/login-service';
import type { LoginResponse, User, RiskAssessment } from '@/types/api/auth';
import { LOGIN_ERRORS } from '@/lib/auth/login-errors';

/**
 * Create successful login response
 */
const createLoginSuccessResponse = (
    user: User,
    accessToken: string,
    refreshToken: string,
    sessionId: string,
    riskAssessment: RiskAssessment,
    isNewDevice: boolean,
    accountWasCreated?: boolean
): LoginResponse => {
    return {
        message: accountWasCreated
            ? 'تم إنشاء الحساب وتسجيل الدخول بنجاح!'
            : 'تم تسجيل الدخول بنجاح.',
        token: accessToken,
        refreshToken,
        sessionId,
        user: {
            id: user.id,
            email: user.email,
            name: user.name || undefined,
            role: user.role || 'user',
            emailVerified: user.emailVerified || false,
            twoFactorEnabled: user.twoFactorEnabled || false,
            lastLogin: user.lastLogin
                ? (typeof user.lastLogin === 'string'
                    ? user.lastLogin
                    : user.lastLogin.toISOString())
                : undefined,
        },
        riskAssessment: {
            level: riskAssessment.level,
            score: riskAssessment.score || 0,
        },
        isNewDevice: isNewDevice || false,
        accountWasCreated: accountWasCreated || false,
    };
};

export class TokenService {
    /**
     * Complete successful login
     * Improved with better error handling and parallel operations
     */
    static async completeLogin(
        user: User,
        userAgent: string,
        ip: string,
        riskAssessment: RiskAssessment,
        isNewDevice: boolean,
        accountWasCreated: boolean,
        clientId: string
    ): Promise<LoginResult> {
        // Validate user data before proceeding
        if (!user || !user.id || !user.email) {
            logger.error('Invalid user data in completeLogin');
            throw new Error('Invalid user data');
        }

        // Reset rate limit on successful login (non-blocking)
        authService.resetRateLimit(clientId).catch((rateLimitError) => {
            if (process.env.NODE_ENV === 'development') {
                logger.debug('Failed to reset rate limit (non-critical):', rateLimitError);
            }
        });

        // Generate tokens first to get a refresh token
        let tempRefreshToken: string;
        try {
            const tokens = await authService.createTokens({
                id: user.id,
                email: user.email,
                name: user.name || undefined,
                role: user.role || undefined,
            });
            tempRefreshToken = tokens.refreshToken;
        } catch (tokenError) {
            logger.error('Failed to generate temp tokens:', tokenError);
            throw new Error(LOGIN_ERRORS.TOKEN_GENERATION_FAILED);
        }

        // Create session with timeout protection
        let session;
        try {
            const deviceInfo = riskAssessment?.deviceFingerprint
                ? JSON.stringify(riskAssessment.deviceFingerprint)
                : '{}';
            const sessionPromise = authService.createSession(user.id, userAgent, ip, tempRefreshToken, deviceInfo);
            const timeoutPromise = new Promise<Session>((resolve, reject) => {
                setTimeout(() => reject(new Error('Session creation timeout')), 5000);
            });

            session = await Promise.race([sessionPromise, timeoutPromise]);
        } catch (sessionError) {
            logger.error('Failed to create session:', sessionError);
            throw new Error(LOGIN_ERRORS.SESSION_CREATION_FAILED);
        }

        if (!session || !session.id) {
            logger.error('Invalid session created', { session });
            throw new Error(LOGIN_ERRORS.SESSION_CREATION_FAILED);
        }

        // Generate final tokens with timeout protection
        let accessToken: string;
        let refreshToken: string;
        try {
            const tokensPromise = authService.createTokens(
                {
                    id: user.id,
                    email: user.email,
                    name: user.name || undefined,
                    role: user.role || undefined,
                },
                session.id,
            );
            const timeoutPromise = new Promise<{ accessToken: string; refreshToken: string }>((resolve, reject) => {
                setTimeout(() => reject(new Error('Token generation timeout')), 5000);
            });

            const tokens = await Promise.race([tokensPromise, timeoutPromise]);
            accessToken = tokens.accessToken;
            refreshToken = tokens.refreshToken;
        } catch (tokenError) {
            logger.error('Failed to generate tokens:', tokenError);
            throw new Error(LOGIN_ERRORS.TOKEN_GENERATION_FAILED);
        }

        if (!accessToken || !refreshToken || accessToken.trim().length === 0 || refreshToken.trim().length === 0) {
            logger.error('Invalid tokens generated', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });
            throw new Error(LOGIN_ERRORS.TOKEN_GENERATION_FAILED);
        }

        // Update session with final refresh token
        try {
            await prisma.session.update({
                where: { id: session.id },
                data: { refreshToken }
            });
        } catch (updateError) {
            logger.warn('Failed to update session with final refresh token:', updateError);
            // Continue, as session was created with temp token which is valid for now
        }

        // Update user with refresh token and last login (non-blocking, parallel execution)
        Promise.allSettled([
            authService.updateLastLogin(user.id),
            prisma.user.update({
                where: { id: user.id },
                data: {
                    lastLogin: new Date(),
                },
            }),
        ]).then((results) => {
            // Log any failures in development mode only
            if (process.env.NODE_ENV === 'development') {
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        logger.debug(`User update operation ${index} failed:`, result.reason);
                    }
                });
            }
        }).catch(() => {
            // Silent fail - login can still proceed
        });

        // Log successful login (non-blocking)
        authService.logSecurityEvent(user.id, 'login_success', ip, {
            userAgent,
            sessionId: session.id,
            riskLevel: riskAssessment.level,
            isNewDevice,
        }).catch((logError) => {
            logger.warn('Failed to log security event:', logError);
        });

        return {
            success: true,
            response: createLoginSuccessResponse(
                user,
                accessToken,
                refreshToken,
                session.id,
                riskAssessment,
                isNewDevice,
                accountWasCreated
            ),
            statusCode: 200,
        };
    }
}
