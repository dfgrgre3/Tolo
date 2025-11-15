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
 */
const getUpdatedAttempts = async (
  rateLimitService: any,
  clientId: string
): Promise<number> => {
  try {
    if (rateLimitService) {
      const updatedRateLimitStatus = await rateLimitService.checkRateLimit(clientId);
      return (updatedRateLimitStatus.attempts || 0) + 1;
    }
  } catch (redisError) {
    logger.warn('Redis unavailable for rate limit check:', redisError);
  }
  return 1;
};

/**
 * Handle failed login attempt
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
  // Record failed attempt
  await authService.recordFailedAttempt(clientId);
  
  // Record IP-based failed attempt
  try {
    const { ipBlockingService } = await import('@/lib/security/ip-blocking');
    ipBlockingService.recordFailedAttempt(ip, `Failed login: ${reason}`);
  } catch (ipBlockError) {
    // Ignore IP blocking errors
  }
  
  // Log security event
  await authService.logSecurityEvent(userId, 'login_failed', ip, {
    userAgent,
    reason,
    email: userId ? undefined : email,
  });

  // Get updated failed attempts count
  const updatedAttempts = await getUpdatedAttempts(rateLimitService, clientId);

  // Require CAPTCHA after threshold failed attempts
  if (captchaService.shouldRequireCaptcha(updatedAttempts)) {
    return {
      success: false,
      response: createCaptchaRequiredResponse(updatedAttempts, 401),
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
   */
  static async initializeRateLimitService(clientId: string): Promise<{
    rateLimitService: any;
    rateLimitStatus: any;
  }> {
    try {
      const { RateLimitingService } = await import('@/lib/rate-limiting-service');
      const { getRedisClient } = await import('@/lib/redis');
      
      const redis = await getRedisClient();
      const rateLimitService = new RateLimitingService(redis);
      const rateLimitStatus = await rateLimitService.checkRateLimit(clientId);
      
      return { rateLimitService, rateLimitStatus };
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
          if (!user || !user.passwordHash) {
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
   */
  static async performRiskAssessment(
    user: any,
    email: string,
    ip: string,
    deviceFingerprint: any,
    userAgent: string
  ): Promise<any> {
    let loginHistory: Array<{
      userId: string | null;
      ip: string;
      createdAt: Date;
      eventType: string;
      userAgent: string;
    }> = [];
    
    try {
      loginHistory = await prisma.securityLog.findMany({
        where: {
          userId: user.id,
          eventType: { in: ['login_success', 'login_failed'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    } catch (dbError) {
      logger.warn('Failed to fetch login history for risk assessment:', dbError);
      loginHistory = [];
    }

    let riskAssessment: any;
    try {
      riskAssessment = await riskAssessmentService.assessLoginRisk(
        {
          userId: user.id,
          email,
          ip,
          deviceFingerprint,
          timestamp: new Date(),
          success: true,
          userAgent,
        },
        loginHistory.map((log) => ({
          userId: log.userId || user.id,
          email,
          ip: log.ip,
          timestamp: log.createdAt,
          success: log.eventType === 'login_success',
          userAgent: log.userAgent,
        }))
      );
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

    // Log risk assessment (non-blocking)
    authService.logSecurityEvent(user.id, 'risk_assessment', ip, {
      userAgent,
      riskLevel: riskAssessment.level,
      riskScore: riskAssessment.score,
      factors: riskAssessment.factors,
    }).catch((logError) => {
      logger.warn('Failed to log risk assessment:', logError);
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
    // Reset rate limit on successful login (non-blocking)
    authService.resetRateLimit(clientId).catch((rateLimitError) => {
      logger.warn('Failed to reset rate limit:', rateLimitError);
    });

    // Create session
    const session = await authService.createSession(user.id, userAgent, ip);
    
    if (!session || !session.id) {
      throw new Error('Failed to create session');
    }

    // Generate tokens
    const { accessToken, refreshToken } = await authService.createTokens(
      {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: (user as any).role || undefined,
      },
      session.id,
    );

    if (!accessToken || !refreshToken) {
      throw new Error('Failed to generate tokens');
    }

    // Update user with refresh token and last login (non-blocking)
    Promise.all([
      authService.updateLastLogin(user.id).catch((updateError) => {
        logger.warn('Failed to update last login:', updateError);
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          refreshToken,
          lastLogin: new Date(),
        },
      }).catch((dbError) => {
        logger.warn('Failed to update user in database:', dbError);
      }),
    ]).catch(() => {
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
   */
  static async login(
    request: NextRequest,
    body: any
  ): Promise<LoginResult> {
    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);
    const clientId = buildClientId(ip, userAgent);

    // Validate JWT_SECRET early
    try {
      this.validateJWTSecret();
    } catch (error) {
      return {
        success: false,
        response: {
          error: 'خطأ في إعدادات الخادم: مفتاح المصادقة غير مُعد بشكل صحيح. يرجى التواصل مع الدعم الفني.',
          code: 'CONFIGURATION_ERROR',
        },
        statusCode: 500,
      };
    }

    // Initialize rate limiting
    const { rateLimitService, rateLimitStatus } = await this.initializeRateLimitService(clientId);

    // Check IP blocking
    const ipBlockResult = await this.checkIPBlocking(ip);
    if (ipBlockResult) return ipBlockResult;

    // Check rate limiting
    const rateLimitResult = await this.checkRateLimiting(rateLimitStatus, ip, userAgent);
    if (rateLimitResult) return rateLimitResult;

    // Validate request body
    const validation = this.validateRequestBody(body);
    if (!validation.valid) {
      return {
        success: false,
        response: validation.error!,
        statusCode: 400,
      };
    }

    const { email, password, rememberMe, deviceFingerprint, captchaToken } = validation.data!;
    const normalizedEmail = email;
    const currentAttempts = rateLimitStatus.attempts || 0;

    // Check CAPTCHA
    const captchaResult = await this.checkCaptcha(currentAttempts, captchaToken, ip, normalizedEmail);
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

    // Check password hash exists
    if (!user.passwordHash || user.passwordHash === 'oauth_user') {
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

    // Verify password
    let passwordMatches = false;
    try {
      passwordMatches = await AuthService.comparePasswords(password, user.passwordHash);
    } catch (passwordError) {
      logger.error('Password comparison error:', passwordError);
      return await handleFailedLogin(
        clientId,
        user.id,
        ip,
        userAgent,
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
        ip,
        userAgent,
        'invalid_password',
        normalizedEmail,
        rateLimitService,
        captchaService
      );
    }

    // Generate device fingerprint
    let fingerprintData;
    if (deviceFingerprint) {
      fingerprintData = deviceFingerprint;
    } else {
      fingerprintData = generateDeviceFingerprint({
        userAgent,
        timezone: 'UTC',
        language: 'ar',
      });
    }

    // Perform risk assessment
    const riskAssessment = await this.performRiskAssessment(
      user,
      normalizedEmail,
      ip,
      fingerprintData,
      userAgent
    );

    // Handle high-risk logins
    if (riskAssessment.level === 'critical' || riskAssessment.blockAccess) {
      await authService.logSecurityEvent(user.id, 'login_blocked_high_risk', ip, {
        userAgent,
        riskLevel: riskAssessment.level,
        riskScore: riskAssessment.score,
      }).catch((logError) => {
        logger.warn('Failed to log high-risk login:', logError);
      });

      securityNotificationService.notifySuspiciousLogin(
        user.id,
        riskAssessment,
        ip
      ).catch((notifyError) => {
        logger.warn('Failed to send security notification:', notifyError);
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

    // Handle new device
    const isNewDevice = riskAssessment.factors?.newDevice || false;
    if (isNewDevice) {
      securityNotificationService.notifyNewDeviceLogin(
        user.id,
        fingerprintData,
        ip
      ).catch((notifyError) => {
        logger.warn('Failed to send new device notification:', notifyError);
      });
    }

    // Register/update device (non-blocking)
    deviceManagerService.registerDevice(
      user.id,
      fingerprintData,
      ip
    ).catch((deviceError) => {
      logger.warn('Failed to register device:', deviceError);
    });

    // Handle two-factor authentication
    const twoFactorResult = await this.handleTwoFactor(
      user,
      riskAssessment,
      ip,
      userAgent
    );
    if (twoFactorResult) return twoFactorResult;

    // Complete successful login
    return await this.completeLogin(
      user,
      userAgent,
      ip,
      riskAssessment,
      isNewDevice,
      accountWasCreated,
      clientId
    );
  }
}

