import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authService, AuthService } from '@/lib/auth-service';
import { TwoFactorChallengeService } from '@/lib/auth-challenges-service';
import { prisma } from '@/lib/prisma';
import { generateDeviceFingerprint } from '@/lib/security/device-fingerprint-shared';
import { riskAssessmentService } from '@/lib/security/risk-assessment';
import { deviceManagerService } from '@/lib/security/device-manager';
import { securityNotificationService } from '@/lib/security/security-notifications';
import { captchaService } from '@/lib/security/captcha-service';
import { emailPasswordProvider } from '@/lib/auth/providers/email-password.provider';
import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { LoginRequest, LoginResponse, LoginErrorResponse } from '@/types/api/auth';
import { logger } from '@/lib/logger';
import { getJWTSecret } from '@/lib/env-validation';
import {
  createErrorResponse,
  createCaptchaRequiredResponse,
  isConnectionError,
  getErrorCode,
  emailSchema
} from '@/app/api/auth/_helpers';

// ==================== CONSTANTS ====================

const TWO_FACTOR_TTL_MINUTES = 10;
const CAPTCHA_THRESHOLD = 3; // Require CAPTCHA after 3 failed attempts

// ==================== VALIDATION SCHEMA ====================

const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل')
    .max(128, 'كلمة المرور طويلة جداً'),
  rememberMe: z.boolean().optional().default(false),
  deviceFingerprint: z.any().optional(),
  captchaToken: z.string().optional(),
});

// ==================== TYPES ====================

export interface LoginContext {
  ip: string;
  userAgent: string;
  clientId: string;
  rateLimitService: any;
  rateLimitStatus: any;
}

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
 * Get updated failed attempts count
 * Improved with better error handling and timeout protection
 */
const getUpdatedAttempts = async (
  rateLimitService: any,
  clientId: string
): Promise<number> => {
  if (!rateLimitService || !clientId) {
    return 1;
  }

  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<number>((resolve) => {
      setTimeout(() => resolve(1), 1000); // 1 second timeout
    });

    const rateLimitPromise = rateLimitService.checkRateLimit(clientId)
      .then((status: any) => (status?.attempts || 0) + 1)
      .catch(() => 1);

    const attempts = await Promise.race([rateLimitPromise, timeoutPromise]);
    return attempts;
  } catch (redisError) {
    logger.warn('Redis unavailable for rate limit check:', redisError);
    return 1;
  }
};

/**
 * Handle failed login attempt
 * Improved with parallel execution and better error handling
 */
const handleFailedLogin = async (
  clientId: string,
  userId: string | null,
  ip: string,
  userAgent: string,
  reason: string,
  email: string,
  rateLimitService: any,
  captchaService: any
): Promise<LoginResult> => {
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
  const updatedAttempts = await getUpdatedAttempts(rateLimitService, clientId);

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
};

/**
 * Create two-factor authentication response
 */
const createTwoFactorResponse = (
  user: any,
  challengeId: string,
  code: string,
  reason?: string,
  riskAssessment?: any
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
      role: (user as any).role || 'user',
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

/**
 * Create successful login response
 */
const createSuccessResponse = (
  user: any,
  accessToken: string,
  refreshToken: string,
  sessionId: string,
  riskAssessment: any,
  isNewDevice: boolean,
  accountWasCreated?: boolean
): LoginResponse => {
  // Validate inputs
  if (!user || !user.id || !user.email) {
    throw new Error('User data is required for login response');
  }

  if (!accessToken || !refreshToken) {
    throw new Error('Tokens are required for login response');
  }

  if (!sessionId) {
    throw new Error('Session ID is required for login response');
  }

  // Validate risk assessment
  if (!riskAssessment || !riskAssessment.level) {
    logger.warn('Risk assessment missing or invalid, using default');
    riskAssessment = {
      level: 'low' as const,
      score: 0,
    };
  }

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
      role: (user as any).role || 'user',
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

// ==================== MAIN SERVICE CLASS ====================

/**
 * LoginService - Handles all login business logic
 * Separated from route handler for better testability and maintainability
 */
export class LoginService {
  /**
   * Validate JWT secret configuration
   * Security: Uses centralized validation to prevent unsafe fallback values
   */
  static validateJWTSecret(): void {
    // Use centralized JWT secret validation from env-validation
    // This ensures consistent security checks across the application
    try {
      getJWTSecret(); // This will throw if invalid
    } catch (error) {
      throw new Error(`JWT_SECRET configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize rate limiting service
   * Improved with timeout protection and better error handling
   */
  static async initializeRateLimitService(clientId: string): Promise<{
    rateLimitService: any;
    rateLimitStatus: any;
  }> {
    if (!clientId) {
      return {
        rateLimitService: null,
        rateLimitStatus: { allowed: true, attempts: 0 },
      };
    }

    try {
      // Add timeout to prevent hanging on Redis connection
      const timeoutPromise = new Promise<{ rateLimitService: any; rateLimitStatus: any }>((resolve) => {
        setTimeout(() => {
          resolve({
            rateLimitService: null,
            rateLimitStatus: { allowed: true, attempts: 0 },
          });
        }, 2000); // 2 second timeout
      });

      const initPromise = (async () => {
        const { RateLimitingService } = await import('@/lib/rate-limiting-service');
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
      logger.warn('IP blocking check failed:', ipBlockError);
    }

    return null;
  }

  /**
   * Check rate limiting
   */
  static async checkRateLimiting(
    rateLimitStatus: any,
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
   * Validate request body
   */
  static validateRequestBody(body: any): { valid: boolean; data?: z.infer<typeof loginSchema>; error?: LoginErrorResponse } {
    // Validate body is an object
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return {
        valid: false,
        error: {
          error: 'بيانات الطلب غير صحيحة. يرجى التحقق من صحة البيانات المرسلة.',
          code: 'INVALID_REQUEST_BODY',
        },
      };
    }

    // Validate schema
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return {
        valid: false,
        error: {
          error: 'بيانات تسجيل الدخول غير صحيحة',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        },
      };
    }

    return { valid: true, data: parsed.data };
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
   * Find user by email
   */
  static async findUser(
    email: string
  ): Promise<any> {
    const user = await authService.findUserByEmail(email);

    if (!user) {
      throw new Error('user_not_found');
    }

    return user;
  }

  /**
   * Perform risk assessment
   * Improved with timeout protection and parallel execution
   */
  static async performRiskAssessment(
    user: any,
    email: string,
    ip: string,
    deviceFingerprint: any,
    userAgent: string
  ): Promise<any> {
    if (!user?.id) {
      return {
        level: 'low' as const,
        score: 0,
        factors: {},
        blockAccess: false,
        requireAdditionalAuth: false,
      };
    }

    // Fetch login history with timeout
    const loginHistoryPromise = Promise.race([
      prisma.securityLog.findMany({
        where: {
          userId: user.id,
          eventType: { in: ['login_success', 'login_failed'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      new Promise<[]>((resolve) => setTimeout(() => resolve([]), 3000)), // 3 second timeout
    ]).catch((dbError) => {
      logger.warn('Failed to fetch login history for risk assessment:', dbError);
      return [];
    });

    const loginHistory = await loginHistoryPromise;

    // Perform risk assessment with timeout
    let riskAssessment: any;
    try {
      const riskAssessmentPromise = riskAssessmentService.assessLoginRisk(
        {
          userId: user.id,
          email,
          ip,
          deviceFingerprint,
          timestamp: new Date(),
          success: true,
          userAgent,
        },
        loginHistory.map((log: any) => ({
          userId: log.userId || user.id,
          email,
          ip: log.ip,
          timestamp: log.createdAt,
          success: log.eventType === 'login_success',
          userAgent: log.userAgent,
        }))
      );

      const timeoutPromise = new Promise<any>((resolve) => {
        setTimeout(() => {
          resolve({
            level: 'low' as const,
            score: 0,
            factors: {},
            blockAccess: false,
            requireAdditionalAuth: false,
          });
        }, 2000); // 2 second timeout
      });

      riskAssessment = await Promise.race([riskAssessmentPromise, timeoutPromise]);
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

    // Log risk assessment (non-blocking, don't wait)
    authService.logSecurityEvent(user.id, 'risk_assessment', ip, {
      userAgent,
      riskLevel: riskAssessment.level,
      riskScore: riskAssessment.score,
      factors: riskAssessment.factors,
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
    user: any,
    riskAssessment: any,
    ip: string,
    userAgent: string
  ): Promise<LoginResult | null> {
    // Force 2FA for medium/high risk even if not enabled
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

      await authService.logSecurityEvent(
        user.id,
        'two_factor_challenge_created_risk',
        ip,
        {
          userAgent,
          delivery: 'email',
          expiresInMinutes: TWO_FACTOR_TTL_MINUTES,
          reason: 'high_risk_login',
          riskLevel: riskAssessment.level,
        }
      );

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

    // Check if user has TOTP 2FA enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const tempToken = await authService.generate2FATempToken({
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role || undefined,
      });

      await authService.logSecurityEvent(
        user.id,
        'two_factor_challenge_created_totp',
        ip,
        {
          userAgent,
          delivery: 'totp',
        }
      );

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
            role: (user as any).role || 'user',
            emailVerified: user.emailVerified || false,
            twoFactorEnabled: true,
          },
        },
        statusCode: 200,
      };
    }

    // Check if user has Email 2FA enabled (legacy or fallback)
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

      await authService.logSecurityEvent(
        user.id,
        'two_factor_challenge_created',
        ip,
        {
          userAgent,
          delivery: 'email',
          expiresInMinutes: TWO_FACTOR_TTL_MINUTES,
        },
      );

      return {
        success: true,
        response: createTwoFactorResponse(user, challengeId, code),
        statusCode: 200,
      };
    }

    return null;
  }

  /**
   * Complete successful login
   * Improved with better error handling and parallel operations
   */
  static async completeLogin(
    user: any,
    userAgent: string,
    ip: string,
    riskAssessment: any,
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
        role: (user as any).role || undefined,
      });
      tempRefreshToken = tokens.refreshToken;
    } catch (tokenError) {
      logger.error('Failed to generate temp tokens:', tokenError);
      throw new Error('فشل في إنشاء رمز المصادقة. يرجى المحاولة مرة أخرى.');
    }

    // Create session with timeout protection
    let session;
    try {
      const deviceInfo = riskAssessment?.deviceFingerprint
        ? JSON.stringify(riskAssessment.deviceFingerprint)
        : '{}';
      const sessionPromise = authService.createSession(user.id, userAgent, ip, tempRefreshToken, deviceInfo);
      const timeoutPromise = new Promise<any>((resolve, reject) => {
        setTimeout(() => reject(new Error('Session creation timeout')), 5000);
      });

      session = await Promise.race([sessionPromise, timeoutPromise]);
    } catch (sessionError) {
      logger.error('Failed to create session:', sessionError);
      throw new Error('فشل في إنشاء الجلسة. يرجى المحاولة مرة أخرى.');
    }

    if (!session || !session.id) {
      logger.error('Invalid session created', { session });
      throw new Error('فشل في إنشاء الجلسة. يرجى المحاولة مرة أخرى.');
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
          role: (user as any).role || undefined,
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
      throw new Error('فشل في إنشاء رمز المصادقة. يرجى المحاولة مرة أخرى.');
    }

    if (!accessToken || !refreshToken || accessToken.trim().length === 0 || refreshToken.trim().length === 0) {
      logger.error('Invalid tokens generated', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });
      throw new Error('فشل في إنشاء رمز المصادقة. يرجى المحاولة مرة أخرى.');
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
      response: createSuccessResponse(
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



  // ... (imports and other functions remain the same)

  // ... (LoginService class definition)

  /**
   * Main login method - orchestrates the entire login flow
   */
  static async login(
    request: NextRequest,
    body: any
  ): Promise<LoginResult> {
    const startTime = Date.now();

    // ... (Initial validation, IP/UserAgent extraction, etc. remain the same)
    try {
      this.validateJWTSecret();
    } catch (error) {
      logger.error('JWT secret validation failed:', error);
      return {
        success: false,
        response: {
          error: 'خطأ في إعدادات الخادم: مفتاح المصادقة غير مُعد بشكل صحيح. يرجى التواصل مع الدعم الفني.',
          code: 'CONFIGURATION_ERROR',
        },
        statusCode: 500,
      };
    }

    const ip = authService.getClientIP(request) || 'unknown';
    const userAgent = authService.getUserAgent(request) || 'unknown';
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

      // ... (Security checks: rate limiting, IP blocking, CAPTCHA)
      // These checks remain the same
      const securityChecksPromise = Promise.allSettled([
        this.initializeRateLimitService(clientId).then(({ rateLimitStatus }) =>
          this.checkRateLimiting(rateLimitStatus, sanitizedIp, sanitizedUserAgent)
        ),
        this.checkIPBlocking(sanitizedIp),
      ]);

      const timeoutPromise = new Promise<Array<PromiseSettledResult<LoginResult | null>>>((resolve) => {
        setTimeout(() => {
          resolve([
            { status: 'fulfilled' as const, value: null },
            { status: 'fulfilled' as const, value: null },
          ]);
        }, 3000);
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
        ? await this.initializeRateLimitService(clientId)
        : { rateLimitService: null, rateLimitStatus: { allowed: true, attempts: 0 } };

      const currentAttempts = rateLimitStatus.attempts || 0;

      const captchaCheckPromise = this.checkCaptcha(currentAttempts, captchaToken, sanitizedIp, normalizedEmail);
      const captchaTimeoutPromise = new Promise<LoginResult | null>((resolve) => {
        setTimeout(() => resolve(null), 2000);
      });

      const captchaResult = await Promise.race([captchaCheckPromise, captchaTimeoutPromise]);
      if (captchaResult) return captchaResult;


      // === REFACTORED AUTHENTICATION LOGIC ===
      const authResult = await emailPasswordProvider.authenticate({ email: normalizedEmail, password });

      let user: any;
      let accountWasCreated = false;

      if (authResult.status === 'error') {
        const userId = (await authService.findUserByEmail(normalizedEmail))?.id ?? null;
        return await handleFailedLogin(
          clientId,
          userId,
          sanitizedIp,
          sanitizedUserAgent,
          authResult.code,
          normalizedEmail,
          rateLimitService,
          captchaService
        );
      }

      user = authResult.user;
      // === END REFACTORED AUTHENTICATION LOGIC ===


      // Enforce email verification (this check is now inside the provider, but we can keep it here as a safeguard)
      if (!user.emailVerified) {
        logger.warn('Login attempt with unverified email', { userId: user.id, email: normalizedEmail });
        return {
          success: false,
          response: {
            error: 'البريد الإلكتروني غير مفعل. يرجى تفعيل حسابك من خلال الرابط المرسل إلى بريدك الإلكتروني.',
            code: 'EMAIL_NOT_VERIFIED',
          },
          statusCode: 403,
        };
      }

      // ... (Device fingerprinting logic remains the same)
      let fingerprintData;
      try {
        if (deviceFingerprint && typeof deviceFingerprint === 'object' && !Array.isArray(deviceFingerprint)) {
          const sanitizedFingerprint: any = {};
          const allowedKeys = ['userAgent', 'timezone', 'language', 'screen', 'platform'];
          const maxStringLength = 500;

          for (const key of allowedKeys) {
            if (deviceFingerprint[key] !== undefined) {
              const value = deviceFingerprint[key];
              if (typeof value === 'string' && value.length <= maxStringLength) {
                sanitizedFingerprint[key] = value;
              } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                sanitizedFingerprint[key] = value;
              }
            }
          }

          fingerprintData = Object.keys(sanitizedFingerprint).length > 0
            ? sanitizedFingerprint
            : generateDeviceFingerprint({
              userAgent: sanitizedUserAgent,
              timezone: 'UTC',
              language: 'ar',
            });
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

      // Perform risk assessment
      const riskAssessment = await this.performRiskAssessment(
        user,
        normalizedEmail,
        sanitizedIp,
        fingerprintData,
        sanitizedUserAgent
      );

      // ... (High-risk login handling remains the same)
      if (riskAssessment.level === 'critical' || riskAssessment.blockAccess) {
        // ...
        return {
          success: false,
          response: {
            error: 'تم رفض تسجيل الدخول بسبب تقييم مخاطر عالي. يرجى التواصل مع الدعم الفني.',
            code: 'HIGH_RISK',
            riskLevel: riskAssessment.level,
          },
          statusCode: 403,
        };
      }

      // ... (New device detection logic remains the same)
      const isNewDevice = riskAssessment.factors?.newDevice || false;
      if (isNewDevice) {
        Promise.allSettled([
          securityNotificationService.notifyNewDeviceLogin(user.id, fingerprintData, sanitizedIp),
          deviceManagerService.registerDevice(user.id, fingerprintData, sanitizedIp),
        ]).catch(() => { });
      } else {
        deviceManagerService.registerDevice(user.id, fingerprintData, sanitizedIp).catch(() => { });
      }


      // Handle 2FA if required by the provider OR by risk assessment
      if (authResult.status === '2fa_required' || riskAssessment.requireAdditionalAuth) {
        const twoFactorResult = await this.handleTwoFactor(user, riskAssessment, sanitizedIp, sanitizedUserAgent);
        if (twoFactorResult) {
          const duration = Date.now() - startTime;
          if (process.env.NODE_ENV === 'development') {
            logger.debug(`Login flow completed (2FA required) in ${duration}ms`);
          }
          return twoFactorResult;
        }
      }

      // Complete successful login
      const result = await this.completeLogin(
        user,
        sanitizedUserAgent,
        sanitizedIp,
        riskAssessment,
        isNewDevice,
        accountWasCreated,
        clientId
      );

      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`Login flow completed successfully in ${duration}ms`);
      }

      return result;

    } catch (error) {
      logger.error('Unexpected error during login:', error);
      return {
        success: false,
        response: {
          error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى لاحقاً.',
          code: 'INTERNAL_SERVER_ERROR',
        },
        statusCode: 500,
      };
    }
  }
}


// Force recompile
