import { NextRequest } from 'next/server';
import { User, SecurityLog } from '@prisma/client';
import { z } from 'zod';
import { authService } from '@/lib/services/auth-service';
import { TwoFactorChallengeService } from '@/lib/services/auth-challenges-service';
import { prisma } from '@/lib/db';
import { generateDeviceFingerprint, DeviceFingerprint } from '@/lib/security/device-fingerprint-shared';
import { riskAssessmentService } from '@/lib/security/risk-assessment';
import { deviceManagerService } from '@/lib/security/device-manager';
import { securityNotificationService } from '@/lib/security/security-notifications';
import { emailPasswordProvider } from '@/lib/auth/providers/email-password.provider';
import { randomBytes, createHash } from 'crypto';
import type { LoginResponse, LoginErrorResponse, User as AuthUser, RiskAssessment } from '@/types/api/auth';
import type { RateLimitService } from '@/types/services';
import { logger } from '@/lib/logger';
import { getJWTSecret } from '@/lib/env-validation';
import {
  emailSchema
} from '@/app/api/auth/_helpers';
import { LOGIN_ERRORS } from '@/lib/auth/login-errors';
import { SecurityCheckService } from '@/lib/services/security-check-service';
import { TokenService } from '@/lib/services/token-service';
import { AuthCacheService, type CachedUser } from '@/lib/services/auth-cache-service';
import { securityLogger, SecurityEventType } from '@/lib/security-logger';
import { extractRequestMetadata } from '@/lib/auth-utils';

// ==================== CONSTANTS ====================

const TWO_FACTOR_TTL_MINUTES = 10;

// ==================== VALIDATION SCHEMA ====================

const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, LOGIN_ERRORS.PASSWORD_TOO_SHORT)
    .max(128, LOGIN_ERRORS.PASSWORD_TOO_LONG),
  rememberMe: z.boolean().optional().default(false),
  deviceFingerprint: z.object({
    userAgent: z.string().max(500).optional(),
    timezone: z.string().max(100).optional(),
    language: z.string().max(50).optional(),
    screen: z.object({
      width: z.number().optional(),
      height: z.number().optional(),
    }).optional(),
    platform: z.string().max(100).optional(),
  }).optional(),
  captchaToken: z.string().optional(),
});

// ==================== TYPES ====================

export interface LoginResult {
  success: boolean;
  response: LoginResponse | LoginErrorResponse;
  statusCode: number;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Build client identifier from IP and User Agent
 */
const buildClientId = (ip: string, userAgent: string): string => {
  const safeIp = ip || 'unknown';
  const safeUserAgent = userAgent || 'unknown';

  // In production, hash the client ID for better privacy
  if (process.env.NODE_ENV === 'production') {
    try {
      const hash = createHash('sha256');
      hash.update(`${safeIp}-${safeUserAgent}`);
      return hash.digest('hex').substring(0, 32);
    } catch {
      return `${safeIp}-${safeUserAgent}`;
    }
  }

  return `${safeIp}-${safeUserAgent}`;
};

/**
 * Generate a secure 6-digit two-factor authentication code
 */
const generateTwoFactorCode = (): string => {
  try {
    const buffer = randomBytes(4);
    const randomNumber = buffer.readUInt32BE(0);
    const code = 100000 + (randomNumber % 900000);
    return code.toString();
  } catch (error) {
    logger.warn('Failed to use crypto for 2FA code generation, using fallback:', error);
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
};

/**
 * Create two-factor authentication response
 */
const createTwoFactorResponse = (
  user: User & { role?: string; twoFactorEnabled?: boolean; twoFactorSecret?: string | null },
  challengeId: string,
  code: string,
  reason?: string,
  riskAssessment?: RiskAssessment
): LoginResponse => {
  return {
    requiresTwoFactor: true,
    loginAttemptId: challengeId,
    expiresAt: new Date(
      Date.now() + TWO_FACTOR_TTL_MINUTES * 60 * 1000
    ).toISOString(),
    methods: ['email'],
    reason: reason || 'two_factor_enabled',
    token: '',
    user: {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role || 'user',
      emailVerified: user.emailVerified || false,
      twoFactorEnabled: user.twoFactorEnabled || false,
    },
    ...(riskAssessment ? {
      riskAssessment: {
        level: riskAssessment.level,
        score: riskAssessment.score,
        recommendations: riskAssessment.recommendations,
      },
    } : {}),
    ...(process.env.NODE_ENV !== 'production' ? { debugCode: code } : {}),
  };
};

// ==================== MAIN SERVICE CLASS ====================

/**
 * LoginService - Handles all login business logic
 * Separated from route handler for better testability and maintainability
 */
export class LoginService {
  /**
    * Validate JWT secret configuration
    */
  static validateJWTSecret(): void {
    try {
      getJWTSecret();
    } catch (error) {
      throw new Error(`JWT_SECRET configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate request body
   */
  static validateRequestBody(body: unknown): { valid: boolean; data?: z.infer<typeof loginSchema>; error?: LoginErrorResponse } {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return {
        valid: false,
        error: {
          error: LOGIN_ERRORS.INVALID_REQUEST_BODY,
          code: 'INVALID_REQUEST_BODY',
        },
      };
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return {
        valid: false,
        error: {
          error: LOGIN_ERRORS.VALIDATION_ERROR,
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        },
      };
    }

    return { valid: true, data: parsed.data };
  }

  /**
   * Perform risk assessment
   */
  static async performRiskAssessment(
    user: User,
    email: string,
    ip: string,
    deviceFingerprint: Record<string, unknown> | null,
    userAgent: string
  ): Promise<RiskAssessment> {
    if (!user?.id) {
      return {
        level: 'low' as const,
        score: 0,
        factors: {},
        blockAccess: false,
        requireAdditionalAuth: false,
      };
    }

    const loginHistoryPromise = Promise.race([
      prisma.securityLog.findMany({
        where: {
          userId: user.id,
          eventType: { in: ['LOGIN_SUCCESS' as any, 'LOGIN_FAILED' as any] },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      new Promise<SecurityLog[]>((resolve) => setTimeout(() => resolve([]), 3000)),
    ]).catch((dbError) => {
      logger.warn('Failed to fetch login history for risk assessment:', dbError);
      return [];
    });

    const loginHistory = await loginHistoryPromise;

    let riskAssessment: RiskAssessment;
    try {
      const riskAssessmentPromise = riskAssessmentService.assessLoginRisk(
        {
          userId: user.id,
          email,
          ip,
          deviceFingerprint: deviceFingerprint as unknown as DeviceFingerprint | undefined,
          timestamp: new Date(),
          success: true,
          userAgent,
        },
        loginHistory.map((log: SecurityLog) => ({
          userId: log.userId || user.id,
          email,
          ip: log.ip,
          timestamp: log.createdAt,
          success: log.eventType === 'LOGIN_SUCCESS',
          userAgent: log.userAgent,
        }))
      );

      const timeoutPromise = new Promise<RiskAssessment>((resolve) => {
        setTimeout(() => {
          resolve({
            level: 'low' as const,
            score: 0,
            factors: {},
            blockAccess: false,
            requireAdditionalAuth: false,
          });
        }, 1000);
      });

      riskAssessment = await Promise.race([riskAssessmentPromise, timeoutPromise]) as unknown as RiskAssessment;
    } catch (riskError) {
      logger.warn('Failed to perform risk assessment:', riskError);
      riskAssessment = {
        level: 'low' as const,
        score: 0,
        factors: {},
        blockAccess: false,
        requireAdditionalAuth: false,
      };
    }

    securityLogger.logEvent({
      userId: user.id,
      eventType: 'SUSPICIOUS_ACTIVITY_DETECTED' as SecurityEventType,
      ip,
      userAgent,
      metadata: {
        riskLevel: riskAssessment.level,
        riskScore: riskAssessment.score,
        factors: riskAssessment.factors,
      }
    }).catch((logError) => {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Failed to log risk assessment:', logError);
      }
    });

    return riskAssessment;
  }

  /**
   * Handle two-factor authentication requirement
   */
  static async handleTwoFactor(
    user: User & { role?: string; twoFactorEnabled?: boolean; twoFactorSecret?: string | null },
    riskAssessment: RiskAssessment,
    ip: string,
    userAgent: string
  ): Promise<LoginResult | null> {
    if (
      riskAssessment.requireAdditionalAuth &&
      (riskAssessment.level === 'high' || riskAssessment.level === 'medium')
    ) {
      const code = generateTwoFactorCode();
      const challengeId = await TwoFactorChallengeService.createChallenge(
        user.id,
        code,
        TWO_FACTOR_TTL_MINUTES
      );

      if (process.env.NODE_ENV !== 'production') {
        logger.info(`[Auth] 2FA code for ${user.email}: ${code}`);
      }

      await securityLogger.logEvent({
        userId: user.id,
        eventType: 'TWO_FACTOR_REQUESTED' as SecurityEventType,
        ip,
        userAgent,
        metadata: {
          delivery: 'email',
          expiresInMinutes: TWO_FACTOR_TTL_MINUTES,
          reason: 'high_risk_login',
          riskLevel: riskAssessment.level,
        }
      });

      return {
        success: true,
        response: createTwoFactorResponse(
          user,
          challengeId,
          code,
          'high_risk',
          riskAssessment
        ),
        statusCode: 200,
      };
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const tempToken = await authService.generate2FATempToken({
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role || undefined,
      });

      await securityLogger.logEvent({
        userId: user.id,
        eventType: 'TWO_FACTOR_REQUESTED' as SecurityEventType,
        ip,
        userAgent,
        metadata: {
          delivery: 'totp'
        }
      });

      return {
        success: true,
        response: {
          requiresTwoFactor: true,
          method: 'totp',
          tempToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name || undefined,
            role: user.role || 'user',
            emailVerified: user.emailVerified || false,
            twoFactorEnabled: true,
          },
        },
        statusCode: 200,
      };
    }

    if (user.twoFactorEnabled) {
      const code = generateTwoFactorCode();
      const challengeId = await TwoFactorChallengeService.createChallenge(
        user.id,
        code,
        TWO_FACTOR_TTL_MINUTES,
      );

      if (process.env.NODE_ENV !== 'production') {
        logger.info(`[Auth] 2FA code for ${user.email}: ${code}`);
      }

      await securityLogger.logEvent({
        userId: user.id,
        eventType: 'TWO_FACTOR_REQUESTED' as SecurityEventType,
        ip,
        userAgent,
        metadata: {
          delivery: 'email',
          expiresInMinutes: TWO_FACTOR_TTL_MINUTES,
        }
      });

      return {
        success: true,
        response: createTwoFactorResponse(user, challengeId, code),
        statusCode: 200,
      };
    }

    return null;
  }

  /**
   * Main login method - orchestrates the entire login flow
   */
  static async login(
    request: NextRequest,
    body: unknown
  ): Promise<LoginResult> {
    const startTime = Date.now();

    try {
      this.validateJWTSecret();
    } catch (error) {
      logger.error('JWT secret validation failed:', error);
      return {
        success: false,
        response: {
          error: LOGIN_ERRORS.CONFIGURATION_ERROR,
          code: 'CONFIGURATION_ERROR',
        },
        statusCode: 500,
      };
    }

    const { ip, userAgent } = extractRequestMetadata(request);
    const sanitizedIp = ip.substring(0, 45);
    const sanitizedUserAgent = userAgent.substring(0, 500);
    const clientId = buildClientId(sanitizedIp, sanitizedUserAgent);

    try {
      const validation = this.validateRequestBody(body);
      if (!validation.valid) {
        return {
          success: false,
          response: validation.error!,
          statusCode: 400,
        };
      }

      const { email, password, rememberMe, deviceFingerprint, captchaToken } = validation.data!;
      const normalizedEmail = email.trim().toLowerCase();

      // === SECURITY CHECKS ===
      const securityChecksPromise = Promise.allSettled([
        SecurityCheckService.initializeRateLimitService(clientId).then(({ rateLimitStatus }) =>
          SecurityCheckService.checkRateLimiting(rateLimitStatus, sanitizedIp, sanitizedUserAgent)
        ),
        SecurityCheckService.checkIPBlocking(sanitizedIp),
      ]);

      const timeoutPromise = new Promise<Array<PromiseSettledResult<LoginResult | null>>>((resolve) => {
        setTimeout(() => {
          resolve([
            { status: 'fulfilled' as const, value: null },
            { status: 'fulfilled' as const, value: null },
          ]);
        }, 1000); // Reduced from 1.5s to 1s for faster fallback
      });

      const [rateLimitResult, ipBlockResult] = await Promise.race([
        securityChecksPromise,
        timeoutPromise,
      ]);

      if (ipBlockResult.status === 'fulfilled' && ipBlockResult.value) {
        return ipBlockResult.value;
      }

      if (rateLimitResult.status === 'fulfilled' && rateLimitResult.value) {
        return rateLimitResult.value;
      }

      const { rateLimitService, rateLimitStatus } = rateLimitResult.status === 'fulfilled'
        ? await SecurityCheckService.initializeRateLimitService(clientId)
        : { rateLimitService: null, rateLimitStatus: { allowed: true, attempts: 0 } };

      const currentAttempts = rateLimitStatus.attempts || 0;

      const captchaCheckPromise = SecurityCheckService.checkCaptcha(currentAttempts, captchaToken, sanitizedIp, normalizedEmail);
      const captchaTimeoutPromise = new Promise<LoginResult | null>((resolve) => {
        setTimeout(() => resolve(null), 1500);
      });

      const captchaResult = await Promise.race([captchaCheckPromise, captchaTimeoutPromise]);
      if (captchaResult) return captchaResult;

      // === AUTHENTICATION ===
      const authResult = await emailPasswordProvider.authenticate({ email: normalizedEmail, password });

      let user: User & { emailVerified?: boolean | null };
      let accountWasCreated = false;

      if (authResult.status === 'error') {
        const userId = (await authService.getUserByEmail(normalizedEmail))?.id ?? null;
        return await SecurityCheckService.handleFailedLogin(
          clientId,
          userId,
          sanitizedIp,
          sanitizedUserAgent,
          authResult.code,
          normalizedEmail,
          rateLimitService
        );
      }

      // Fetch full user details with caching for performance
      const fullUser = await AuthCacheService.getOrSetUser(
        normalizedEmail,
        async () => {
          const user = await prisma.user.findUnique({
            where: { id: authResult.user.id }
          });
          if (!user) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash: user.passwordHash || '',
            role: user.role || 'user',
            emailVerified: user.emailVerified || false,
            twoFactorEnabled: user.twoFactorEnabled || false,
          } as CachedUser;
        }
      );

      if (!fullUser) {
        return {
          success: false,
          response: {
            error: LOGIN_ERRORS.INVALID_CREDENTIALS,
            code: 'INVALID_CREDENTIALS',
          },
          statusCode: 401,
        };
      }

      // Convert CachedUser to User type for compatibility
      user = {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        passwordHash: fullUser.passwordHash,
        role: fullUser.role,
        emailVerified: fullUser.emailVerified,
        twoFactorEnabled: fullUser.twoFactorEnabled,
        twoFactorSecret: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User & { emailVerified?: boolean | null };

      // Enforce email verification
      if (!user.emailVerified && process.env.NODE_ENV !== 'development') {
        logger.warn('Login attempt with unverified email', { userId: user.id, email: normalizedEmail });
        return {
          success: false,
          response: {
            error: LOGIN_ERRORS.EMAIL_NOT_VERIFIED,
            code: 'EMAIL_NOT_VERIFIED',
          },
          statusCode: 403,
        };
      }

      // === DEVICE FINGERPRINTING ===
      let fingerprintData: DeviceFingerprint;
      try {
        if (deviceFingerprint) {
          // Direct typed access to validated fingerprint properties
          const sanitizedFingerprint: Record<string, unknown> = {};

          if (deviceFingerprint.userAgent) {
            sanitizedFingerprint.userAgent = deviceFingerprint.userAgent;
          }
          if (deviceFingerprint.timezone) {
            sanitizedFingerprint.timezone = deviceFingerprint.timezone;
          }
          if (deviceFingerprint.language) {
            sanitizedFingerprint.language = deviceFingerprint.language;
          }
          if (deviceFingerprint.screen) {
            sanitizedFingerprint.screen = deviceFingerprint.screen;
          }
          if (deviceFingerprint.platform) {
            sanitizedFingerprint.platform = deviceFingerprint.platform;
          }

          // Generate a full fingerprint from the partial data or fallback
          const generated = generateDeviceFingerprint({
            userAgent: sanitizedUserAgent,
            timezone: (sanitizedFingerprint.timezone as string) || 'UTC',
            language: (sanitizedFingerprint.language as string) || 'ar',
            platform: (sanitizedFingerprint.platform as string),
          });

          fingerprintData = {
            ...generated,
            ...sanitizedFingerprint
          } as DeviceFingerprint;
        } else {
          fingerprintData = generateDeviceFingerprint({
            userAgent: sanitizedUserAgent,
            timezone: 'UTC',
            language: 'ar',
          });
        }
      } catch (fingerprintError) {
        logger.warn('Failed to generate device fingerprint, using fallback:', fingerprintError instanceof Error ? fingerprintError.message : String(fingerprintError));
        fingerprintData = generateDeviceFingerprint({
          userAgent: sanitizedUserAgent,
          timezone: 'UTC',
          language: 'ar',
        });
      }

      // === RISK ASSESSMENT ===
      const riskAssessment = await this.performRiskAssessment(
        user,
        normalizedEmail,
        sanitizedIp,
        fingerprintData as unknown as Record<string, unknown>,
        sanitizedUserAgent
      );

      // Cast risk assessment to API type to resolve compatibility issues
      const apiRiskAssessment = riskAssessment as unknown as RiskAssessment;

      // Attach device fingerprint to risk assessment for token service
      if (fingerprintData) {
        apiRiskAssessment.deviceFingerprint = fingerprintData as unknown as Record<string, unknown>;
      }

      if (apiRiskAssessment.level === 'critical' || apiRiskAssessment.blockAccess) {
        return {
          success: false,
          response: {
            error: LOGIN_ERRORS.HIGH_RISK,
            code: 'HIGH_RISK',
            riskLevel: apiRiskAssessment.level,
          },
          statusCode: 403,
        };
      }

      const isNewDevice = apiRiskAssessment.factors?.newDevice || false;
      if (isNewDevice) {
        Promise.allSettled([
          securityNotificationService.notifyNewDeviceLogin(user.id, fingerprintData, sanitizedIp),
          deviceManagerService.registerDevice(user.id, fingerprintData, sanitizedIp),
        ]).catch(() => { });
      } else {
        deviceManagerService.registerDevice(user.id, fingerprintData, sanitizedIp).catch(() => { });
      }

      // Ensure role and emailVerified are not null for strict typing
      const safeUser = {
        ...user,
        role: user.role || 'user',
        emailVerified: user.emailVerified || false
      };

      // === TWO FACTOR AUTHENTICATION ===
      if (authResult.status === '2fa_required' || apiRiskAssessment.requireAdditionalAuth) {
        const twoFactorResult = await this.handleTwoFactor(safeUser, apiRiskAssessment, sanitizedIp, sanitizedUserAgent);
        if (twoFactorResult) {
          const duration = Date.now() - startTime;
          if (process.env.NODE_ENV === 'development') {
            logger.debug(`Login flow completed (2FA required) in ${duration}ms`);
          }
          return twoFactorResult;
        }
      }

      // === COMPLETE LOGIN ===
      const result = await TokenService.completeLogin(
        safeUser,
        sanitizedUserAgent,
        sanitizedIp,
        apiRiskAssessment,
        isNewDevice,
        accountWasCreated,
        clientId
      );

      const duration = Date.now() - startTime;

      // Log performance metrics (structured for monitoring)
      logger.info('Login completed', {
        duration,
        success: result.success,
        statusCode: result.statusCode,
        isNewDevice,
        riskLevel: apiRiskAssessment.level,
        ...(duration > 2000 && { slow: true }),
      });

      return result;

    } catch (error) {
      logger.error('Unexpected error during login:', error);
      return {
        success: false,
        response: {
          error: LOGIN_ERRORS?.INTERNAL_SERVER_ERROR || 'حدث خطأ داخلي في الخادم. يرجى المحاولة لاحقاً.',
          code: 'INTERNAL_SERVER_ERROR',
        },
        statusCode: 500,
      };
    }
  }
}
