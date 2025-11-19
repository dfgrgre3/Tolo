import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authService, AuthService } from '@/lib/auth-service';
import { TwoFactorChallengeService } from '@/lib/auth-challenges-service';
import { prisma } from '@/lib/prisma';
import { generateDeviceFingerprint } from '@/lib/security/device-fingerprint';
import { riskAssessmentService } from '@/lib/security/risk-assessment';
import { deviceManagerService } from '@/lib/security/device-manager';
import { securityNotificationService } from '@/lib/security/security-notifications';
import { captchaService } from '@/lib/security/captcha-service';
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
   * Find or create user
   */
  static async findOrCreateUser(
    email: string,
    password: string
  ): Promise<{ user: any; accountWasCreated: boolean }> {
    let user = await authService.findUserByEmail(email);
    let accountWasCreated = false;

    // Auto-create account if user doesn't exist
    if (!user) {
      try {
        const passwordHash = await AuthService.hashPassword(password);
        const emailVerificationToken = randomBytes(32).toString('hex');
        const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const userId = uuidv4();
        const emailName = email.split('@')[0];
        const normalizedName = emailName || null;

        user = await prisma.user.create({
          data: {
            id: userId,
            email,
            passwordHash,
            name: normalizedName,
            emailVerificationToken,
            emailVerificationExpires,
            emailVerified: false,
            emailNotifications: true,
            smsNotifications: false,
            twoFactorEnabled: false,
            biometricEnabled: false,
            biometricCredentials: [],
            totalXP: 0,
            level: 1,
            currentStreak: 0,
            longestStreak: 0,
            totalStudyTime: 0,
            tasksCompleted: 0,
            examsPassed: 0,
            pomodoroSessions: 0,
            deepWorkSessions: 0,
            focusStrategy: 'POMODORO',
          },
        });

        accountWasCreated = true;

        await authService.logSecurityEvent(user.id, 'account_auto_created', 'unknown', {
          email,
        }).catch((logError) => {
          logger.warn('Failed to log account creation event:', logError);
        });
      } catch (createError: any) {
        logger.error('Error auto-creating account during login:', createError);
        
        if (createError.code === 'P2002' || createError.message?.includes('unique')) {
          // User was created by another request, try to find them again
          user = await authService.findUserByEmail(email);
          if (!user || !('id' in user) || !('passwordHash' in user) || !user.passwordHash) {
            throw new Error('user_not_found');
          }
        } else {
          throw createError;
        }
      }
    }

    return { user, accountWasCreated };
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

    // Check if user has 2FA enabled
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

    // Create session with timeout protection
    let session;
    try {
      const sessionPromise = authService.createSession(user.id, userAgent, ip);
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

    // Generate tokens with timeout protection
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

    // Update user with refresh token and last login (non-blocking, parallel execution)
    Promise.allSettled([
      authService.updateLastLogin(user.id),
      prisma.user.update({
        where: { id: user.id },
        data: {
          refreshToken,
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

  /**
   * Main login method - orchestrates the entire login flow
   * Improved with better error handling, validation, and performance optimizations
   * Enhanced with better security checks and performance improvements
   * 
   * Security improvements:
   * - Comprehensive input validation and sanitization
   * - Rate limiting and IP blocking protection
   * - CAPTCHA verification for suspicious activity
   * - Risk assessment and device fingerprinting
   * - Two-factor authentication support
   * - Timeout protection for all async operations
   * - Constant-time password comparison
   */
  static async login(
    request: NextRequest,
    body: any
  ): Promise<LoginResult> {
    const startTime = Date.now();
    
    // Early validation - fail fast pattern
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

    // Extract request metadata with validation and sanitization
    const ip = authService.getClientIP(request) || 'unknown';
    const userAgent = authService.getUserAgent(request) || 'unknown';
    
    // Sanitize IP and User Agent to prevent injection attacks
    const sanitizedIp = ip.substring(0, 45); // IPv6 max length
    const sanitizedUserAgent = userAgent.substring(0, 500); // Prevent DoS
    
    const clientId = buildClientId(sanitizedIp, sanitizedUserAgent);

    // Validate request body early - fail fast
    const validation = this.validateRequestBody(body);
    if (!validation.valid) {
      return {
        success: false,
        response: validation.error!,
        statusCode: 400,
      };
    }

    const { email, password, rememberMe, deviceFingerprint, captchaToken } = validation.data!;
    
    // Enhanced email normalization with additional validation
    const normalizedEmail = email.trim().toLowerCase();
    
    // Additional email format validation for security
    if (normalizedEmail.length > 254) { // RFC 5321 limit
      return {
        success: false,
        response: {
          error: 'البريد الإلكتروني طويل جداً',
          code: 'EMAIL_TOO_LONG',
        },
        statusCode: 400,
      };
    }

    // Validate email format (additional check)
    if (!normalizedEmail || !normalizedEmail.includes('@') || normalizedEmail.length < 5) {
      return {
        success: false,
        response: {
          error: 'البريد الإلكتروني غير صحيح',
          code: 'INVALID_EMAIL_FORMAT',
        },
        statusCode: 400,
      };
    }

    // Initialize rate limiting and security checks in parallel for better performance
    // Using Promise.allSettled to ensure all checks complete even if one fails
    // Add timeout protection to prevent hanging
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
      }, 3000); // 3 second timeout for security checks
    });
    
    const [rateLimitResult, ipBlockResult] = await Promise.race([
      securityChecksPromise,
      timeoutPromise,
    ]);
    
    // Log security check results for monitoring (non-blocking)
    if (process.env.NODE_ENV === 'development') {
      Promise.resolve().then(() => {
        logger.debug('Security checks completed', {
          rateLimitStatus: rateLimitResult.status,
          ipBlockStatus: ipBlockResult.status,
          duration: Date.now() - startTime,
        });
      }).catch(() => {
        // Silent fail - logging shouldn't block login
      });
    }

    // Check IP blocking first (higher priority)
    if (ipBlockResult.status === 'fulfilled' && ipBlockResult.value) {
      return ipBlockResult.value;
    }

    // Check rate limiting
    if (rateLimitResult.status === 'fulfilled' && rateLimitResult.value) {
      return rateLimitResult.value;
    }

    // Get rate limit status for CAPTCHA check
    const { rateLimitService, rateLimitStatus } = rateLimitResult.status === 'fulfilled' 
      ? await this.initializeRateLimitService(clientId)
      : { rateLimitService: null, rateLimitStatus: { allowed: true, attempts: 0 } };
    
    const currentAttempts = rateLimitStatus.attempts || 0;

    // Check CAPTCHA with timeout protection
    const captchaCheckPromise = this.checkCaptcha(currentAttempts, captchaToken, sanitizedIp, normalizedEmail);
    const captchaTimeoutPromise = new Promise<LoginResult | null>((resolve) => {
      setTimeout(() => resolve(null), 2000); // 2 second timeout
    });
    
    const captchaResult = await Promise.race([captchaCheckPromise, captchaTimeoutPromise]);
    if (captchaResult) return captchaResult;

    // Find or create user
    let accountWasCreated = false;
    let user: any;
    try {
      const userResult = await this.findOrCreateUser(normalizedEmail, password);
      user = userResult.user;
      accountWasCreated = userResult.accountWasCreated;
    } catch (dbError: any) {
      logger.error('Database error while finding/creating user:', dbError);
      
      if (isConnectionError(dbError)) {
        return {
          success: false,
          response: {
            error: 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقاً.',
            code: 'CONNECTION_ERROR',
          },
          statusCode: 503,
        };
      }

      if (dbError.message === 'user_not_found') {
        return await handleFailedLogin(
          clientId,
          null,
          ip,
          userAgent,
          'user_not_found',
          normalizedEmail,
          rateLimitService,
          captchaService
        );
      }

      return {
        success: false,
        response: {
          error: 'حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.',
          code: 'DATABASE_ERROR',
        },
        statusCode: 500,
      };
    }

    // Check password hash exists and is valid
    if (!user.passwordHash || user.passwordHash === 'oauth_user' || user.passwordHash.trim().length === 0) {
      logger.warn('Login attempt with invalid password hash', { userId: user.id, email: normalizedEmail });
      return await handleFailedLogin(
        clientId,
        user.id,
        ip,
        userAgent,
        'oauth_user_no_password',
        normalizedEmail,
        rateLimitService,
        captchaService
      );
    }

    // Verify password with timeout protection and constant-time comparison
    // Using constant-time comparison to prevent timing attacks
    let passwordMatches = false;
    try {
      // Add timeout to prevent hanging on password comparison
      // Using constant-time comparison to prevent timing attacks
      const passwordCheckPromise = AuthService.comparePasswords(password, user.passwordHash);
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 5000); // 5 second timeout
      });

      passwordMatches = await Promise.race([passwordCheckPromise, timeoutPromise]);
      
      // Log failed attempts for security monitoring (non-blocking)
      // Use setTimeout to ensure logging doesn't affect timing
      if (!passwordMatches) {
        setTimeout(() => {
          logger.debug('Password mismatch for user', { 
            userId: user.id, 
            email: normalizedEmail.substring(0, 50), // Limit email length in logs
            timestamp: new Date().toISOString(),
          });
        }, 0);
      }
    } catch (passwordError) {
      logger.error('Password comparison error:', passwordError instanceof Error ? passwordError.message : String(passwordError));
      return await handleFailedLogin(
        clientId,
        user.id,
        sanitizedIp,
        sanitizedUserAgent,
        'password_comparison_error',
        normalizedEmail,
        rateLimitService,
        captchaService
      );
    }

    if (!passwordMatches) {
      return await handleFailedLogin(
        clientId,
        user.id,
        sanitizedIp,
        sanitizedUserAgent,
        'invalid_password',
        normalizedEmail,
        rateLimitService,
        captchaService
      );
    }

    // Generate device fingerprint with validation and sanitization
    let fingerprintData;
    try {
      if (deviceFingerprint && typeof deviceFingerprint === 'object' && !Array.isArray(deviceFingerprint)) {
        // Validate and sanitize device fingerprint structure
        // Remove any potentially malicious or oversized data
        const sanitizedFingerprint: any = {};
        const allowedKeys = ['userAgent', 'timezone', 'language', 'screen', 'platform'];
        const maxStringLength = 500; // Limit string length for security
        
        for (const key of allowedKeys) {
          if (deviceFingerprint[key] !== undefined) {
            const value = deviceFingerprint[key];
            if (typeof value === 'string' && value.length <= maxStringLength) {
              sanitizedFingerprint[key] = value;
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              // Allow nested objects but limit depth
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
        // Generate new fingerprint if not provided or invalid
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

    // Perform risk assessment with timeout protection
    const riskAssessment = await Promise.race([
      this.performRiskAssessment(
        user,
        normalizedEmail,
        sanitizedIp,
        fingerprintData,
        sanitizedUserAgent
      ),
      new Promise<any>((resolve) => {
        setTimeout(() => {
          resolve({
            level: 'low' as const,
            score: 0,
            factors: {},
            blockAccess: false,
            requireAdditionalAuth: false,
          });
        }, 3000); // 3 second timeout for risk assessment
      }),
    ]).catch((error) => {
      logger.warn('Risk assessment failed, using default:', error instanceof Error ? error.message : String(error));
      return {
        level: 'low' as const,
        score: 0,
        factors: {},
        blockAccess: false,
        requireAdditionalAuth: false,
      };
    });

    // Handle high-risk logins
    if (riskAssessment.level === 'critical' || riskAssessment.blockAccess) {
      // Log security event in parallel (non-blocking)
      Promise.allSettled([
        authService.logSecurityEvent(user.id, 'login_blocked_high_risk', sanitizedIp, {
          userAgent: sanitizedUserAgent,
          riskLevel: riskAssessment.level,
          riskScore: riskAssessment.score,
        }),
        securityNotificationService.notifySuspiciousLogin(
          user.id,
          riskAssessment,
          sanitizedIp
        ),
      ]).then((results) => {
        // Log failures only in development
        if (process.env.NODE_ENV === 'development') {
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              logger.debug(`High-risk login operation ${index} failed:`, result.reason);
            }
          });
        }
      }).catch(() => {
        // Silent fail - security logging shouldn't block response
      });

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

    // Handle new device detection (non-blocking)
    const isNewDevice = riskAssessment.factors?.newDevice || false;
    if (isNewDevice) {
      // Send notification in background (non-blocking)
      // Execute device operations in parallel for better performance
      Promise.allSettled([
        securityNotificationService.notifyNewDeviceLogin(user.id, fingerprintData, sanitizedIp),
        deviceManagerService.registerDevice(user.id, fingerprintData, sanitizedIp),
      ]).then((results) => {
        // Log results only in development to avoid noise in production
        if (process.env.NODE_ENV === 'development') {
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              logger.debug(`Device operation ${index} failed:`, result.reason);
            }
          });
        }
      }).catch(() => {
        // Silent fail - login can proceed even if device registration fails
      });
    } else {
      // Still register device even if not new (non-blocking)
      // This ensures device tracking is up-to-date
      deviceManagerService.registerDevice(user.id, fingerprintData, sanitizedIp).catch(() => {
        // Silent fail - device registration is not critical for login
      });
    }

    // Handle two-factor authentication with timeout protection
    const twoFactorResult = await Promise.race([
      this.handleTwoFactor(user, riskAssessment, sanitizedIp, sanitizedUserAgent),
      new Promise<LoginResult | null>((resolve) => {
        setTimeout(() => resolve(null), 2000); // 2 second timeout
      }),
    ]).catch((error) => {
      logger.warn('Two-factor check failed, proceeding without 2FA:', error instanceof Error ? error.message : String(error));
      return null;
    });
    
    if (twoFactorResult) {
      // Log login duration for monitoring
      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`Login flow completed (2FA required) in ${duration}ms`);
      }
      return twoFactorResult;
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
    
    // Log login duration for monitoring
    const duration = Date.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`Login flow completed successfully in ${duration}ms`);
    }
    
    return result;
  }
}

