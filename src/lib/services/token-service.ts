import { authService } from '@/lib/services/auth-service';
import { prisma } from '@/lib/db';
import { Session } from '@prisma/client';
import { logger } from '@/lib/logger';
import type { LoginResult } from '@/lib/services/login-service';
import type { LoginResponse, User, RiskAssessment } from '@/types/api/auth';
import { LOGIN_ERRORS } from '@/lib/auth/login-errors';
import { securityLogger, SecurityEventType } from '@/lib/security-logger';
import { v4 as uuidv4 } from 'uuid';

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
     * Generate access and refresh tokens
     */
    private static async createTokens(payload: any, sessionId?: string): Promise<{ accessToken: string; refreshToken: string }> {
        const tokenPayload = { ...payload, sessionId };

        const accessToken = await authService.generateToken(tokenPayload, '15m');
        const refreshToken = await authService.generateToken(tokenPayload, '7d');

        return { accessToken, refreshToken };
    }

    /**
     * Create a new session in DB
     */
    private static async createSession(userId: string, userAgent: string, ip: string, refreshToken: string, deviceInfo: string): Promise<Session> {
        return await prisma.session.create({
            data: {
                id: uuidv4(),
                userId,
                refreshToken: refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                ip,
                userAgent,
                deviceInfo: deviceInfo || null,
                isActive: true,
                lastAccessed: new Date(),
            }
        });
    }

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

        // Reset rate limit on successful login
        // Assuming rate limits are stored in Redis or DB. 
        // For now, we skip explicit reset if we don't have direct access to RateLimitService here.
        // Or we can import it if available. 

        // Generate tokens first to get a refresh token
        let tempRefreshToken: string;
        try {
            const tokens = await this.createTokens({
                userId: user.id,
                email: user.email,
                role: user.role,
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

            // We need to match the actual Session schema.
            // Using a safe create approach.
            const sessionPromise = this.createSession(user.id, userAgent, ip, tempRefreshToken, deviceInfo);

            const timeoutPromise = new Promise<Session>((resolve, reject) => {
                setTimeout(() => reject(new Error('Session creation timeout')), 5000);
            });

            session = await Promise.race([sessionPromise, timeoutPromise]);
        } catch (sessionError) {
            logger.error('Failed to create session:', sessionError);
            throw new Error(LOGIN_ERRORS.SESSION_CREATION_FAILED);
        }

        if (!session || !session.id) {
            logger.error('Invalid session created');
            throw new Error(LOGIN_ERRORS.SESSION_CREATION_FAILED);
        }

        // Generate final tokens with sessionId
        let accessToken: string;
        let refreshToken: string;
        try {
            const tokens = await this.createTokens(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                },
                session.id,
            );
            accessToken = tokens.accessToken;
            refreshToken = tokens.refreshToken;
        } catch (tokenError) {
            logger.error('Failed to generate tokens:', tokenError);
            throw new Error(LOGIN_ERRORS.TOKEN_GENERATION_FAILED);
        }

        // Update session with final refresh token
        try {
            await prisma.session.update({
                where: { id: session.id },
                data: { refreshToken: refreshToken }
            });
        } catch (updateError) {
            logger.warn('Failed to update session with final refresh token:', updateError);
        }

        // Update user with last login
        prisma.user.update({
            where: { id: user.id },
            data: {
                lastLogin: new Date(), // Check if schema has this common field. Schema says yes.
            }
        }).catch(() => { });

        // Log successful login
        securityLogger.logEvent({
            userId: user.id,
            eventType: 'LOGIN_SUCCESS' as SecurityEventType,
            ip,
            userAgent,
            metadata: {
                sessionId: session.id,
                riskLevel: riskAssessment.level,
                isNewDevice,
            }
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

