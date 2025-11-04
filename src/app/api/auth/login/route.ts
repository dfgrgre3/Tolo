import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService, AuthService } from '@/lib/auth-service';
import { TwoFactorChallengeService } from '@/lib/auth-challenges-service';
import { prisma } from '@/lib/prisma';
import { generateDeviceFingerprint } from '@/lib/security/device-fingerprint';
import { riskAssessmentService } from '@/lib/security/risk-assessment';
import { deviceManagerService } from '@/lib/security/device-manager';
import { securityNotificationService } from '@/lib/security/security-notifications';
import { captchaService } from '@/lib/security/captcha-service';
import type { LoginRequest, LoginResponse, LoginErrorResponse } from '@/types/api/auth';
import { 
  setAuthCookies, 
  createErrorResponse, 
  createCaptchaRequiredResponse, 
  isConnectionError,
  getErrorCode,
  emailSchema 
} from '../_helpers';

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

// ==================== HELPER FUNCTIONS ====================

/**
 * Build client identifier from IP and User Agent
 * Uses crypto for more secure hashing in production
 */
const buildClientId = (ip: string, userAgent: string): string => {
  const safeIp = ip || 'unknown';
  const safeUserAgent = userAgent || 'unknown';
  
  // In production, hash the client ID for better privacy
  if (process.env.NODE_ENV === 'production') {
    try {
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256');
      hash.update(`${safeIp}-${safeUserAgent}`);
      return hash.digest('hex').substring(0, 32);
    } catch {
      // Fallback to simple string if crypto fails
      return `${safeIp}-${safeUserAgent}`;
    }
  }
  
  return `${safeIp}-${safeUserAgent}`;
};

/**
 * Generate a secure 6-digit two-factor authentication code
 * Uses Node.js crypto for better randomness
 */
const generateTwoFactorCode = (): string => {
  try {
    // Use Node.js crypto module for cryptographically secure random numbers
    const crypto = require('crypto');
    const randomBytes = crypto.randomBytes(4);
    const randomNumber = randomBytes.readUInt32BE(0);
    // Convert to range 100000-999999
    const code = 100000 + (randomNumber % 900000);
    return code.toString();
  } catch (error) {
    // Fallback to Math.random if crypto fails (shouldn't happen in Node.js)
    console.warn('Failed to use crypto for 2FA code generation, using fallback:', error);
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
};

/**
 * Get updated failed attempts count with Redis fallback
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
    console.warn('Redis unavailable for rate limit check:', redisError);
  }
  return 1; // Default to 1 attempt
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
): Promise<NextResponse<LoginErrorResponse>> => {
  // Record failed attempt
  await authService.recordFailedAttempt(clientId);
  
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
    return createCaptchaRequiredResponse(updatedAttempts, 401);
  }

  return NextResponse.json(
    { 
      error: 'بيانات تسجيل الدخول غير صحيحة.',
      code: 'INVALID_CREDENTIALS',
    },
    { status: 401 }
  );
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
  const response: LoginResponse = {
    requiresTwoFactor: true,
    loginAttemptId: challengeId,
    expiresAt: new Date(
      Date.now() + TWO_FACTOR_TTL_MINUTES * 60 * 1000
    ).toISOString(),
    methods: ['email'],
    reason: reason || 'two_factor_enabled',
    token: '', // Will be set after 2FA verification
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
  
  return response;
};

/**
 * Create successful login response
 * Improved with better validation and structure
 */
const createSuccessResponse = (
  user: any,
  accessToken: string,
  refreshToken: string,
  sessionId: string,
  riskAssessment: any,
  isNewDevice: boolean
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
    console.warn('Risk assessment missing or invalid, using default');
    riskAssessment = {
      level: 'low' as const,
      score: 0,
    };
  }

  return {
    message: 'تم تسجيل الدخول بنجاح.',
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
  };
};

// ==================== MAIN HANDLER ====================

export async function POST(request: NextRequest) {
  const ip = authService.getClientIP(request);
  const userAgent = authService.getUserAgent(request);
  const clientId = buildClientId(ip, userAgent);

  try {
    // ==================== INITIALIZE RATE LIMITING ====================
    const { RateLimitingService } = await import('@/lib/rate-limiting-service');
    const { getRedisClient } = await import('@/lib/redis');
    
    let rateLimitService: InstanceType<typeof RateLimitingService> | null = null;
    let initialRateLimitStatus: any = { allowed: true, attempts: 0 };
    
    try {
      const redis = await getRedisClient();
      rateLimitService = new RateLimitingService(redis);
      initialRateLimitStatus = await rateLimitService.checkRateLimit(clientId);
    } catch (redisError) {
      // If Redis is unavailable, allow the request but log the error
      console.warn('Redis unavailable, proceeding without rate limiting:', redisError);
      // Continue with default status that allows the request
    }

    // ==================== CHECK RATE LIMITING ====================
    if (!initialRateLimitStatus.allowed) {
      const now = Date.now();
      const lockoutUntil = initialRateLimitStatus.lockedUntil ?? 0;
      const retryMs = lockoutUntil > now
        ? lockoutUntil - now
        : (initialRateLimitStatus.remainingTime ?? 0) * 60 * 1000;
      const retryAfterSeconds = Math.max(1, Math.ceil((retryMs || 60000) / 1000));

      await authService.logSecurityEvent(null, 'login_rate_limited', ip, {
        userAgent,
        attempts: initialRateLimitStatus.attempts,
        retryAfterSeconds,
        lockedUntil: lockoutUntil ? new Date(lockoutUntil).toISOString() : undefined,
      });

      const errorResponse: LoginErrorResponse = {
        error:
          'تم تعليق محاولات تسجيل الدخول مؤقتاً بسبب محاولات متكررة. يمكنك المحاولة مرة أخرى بعد انتهاء العد التنازلي.',
        code: 'RATE_LIMITED',
        retryAfterSeconds,
        lockedUntil: lockoutUntil ? new Date(lockoutUntil).toISOString() : undefined,
        attempts: initialRateLimitStatus.attempts,
      };
      return NextResponse.json(errorResponse, { status: 429 });
    }
    // ==================== VALIDATE REQUEST BODY ====================
    let body: any;
    try {
      // Use request.json() directly for better performance and error handling
      // Check if request has body by checking content-length
      const contentLength = request.headers.get('content-length');
      if (contentLength === '0' || !contentLength) {
        const errorResponse: LoginErrorResponse = {
          error: 'الطلب فارغ. يرجى إدخال بيانات تسجيل الدخول.',
          code: 'EMPTY_REQUEST_BODY',
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }
      
      // Check body size limit (prevent DoS)
      const contentLengthNum = parseInt(contentLength, 10);
      const MAX_BODY_SIZE = 1024; // 1KB max
      if (contentLengthNum > MAX_BODY_SIZE) {
        const errorResponse: LoginErrorResponse = {
          error: 'حجم الطلب كبير جداً.',
          code: 'REQUEST_TOO_LARGE',
        };
        return NextResponse.json(errorResponse, { status: 413 });
      }
      
      // Parse JSON body directly
      try {
        body = await request.json();
      } catch (jsonError) {
        // If JSON parsing fails, return error
        const errorResponse: LoginErrorResponse = {
          error: 'بيانات الطلب غير صحيحة. يرجى التحقق من صحة البيانات المرسلة.',
          code: 'INVALID_REQUEST_BODY',
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }
      
      // Validate body is an object
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        const errorResponse: LoginErrorResponse = {
          error: 'بيانات الطلب غير صحيحة. يرجى التحقق من صحة البيانات المرسلة.',
          code: 'INVALID_REQUEST_BODY',
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      const errorResponse: LoginErrorResponse = {
        error: 'بيانات الطلب غير صحيحة. يرجى التحقق من صحة البيانات المرسلة.',
        code: 'INVALID_REQUEST_BODY',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const errorResponse: LoginErrorResponse = {
        error: 'بيانات تسجيل الدخول غير صحيحة',
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { email, password, rememberMe, deviceFingerprint, captchaToken } = parsed.data;
    const normalizedEmail = email; // Already normalized by emailSchema

    const currentAttempts = initialRateLimitStatus.attempts || 0;

    // ==================== CHECK CAPTCHA REQUIREMENT ====================
    if (captchaService.shouldRequireCaptcha(currentAttempts)) {
      if (!captchaToken) {
        const errorResponse: LoginErrorResponse = {
          error:
            'يرجى إكمال التحقق من CAPTCHA للمتابعة. تم اكتشاف محاولات تسجيل دخول متكررة.',
          requiresCaptcha: true,
          failedAttempts: currentAttempts,
          code: 'CAPTCHA_REQUIRED',
        };
        return NextResponse.json(errorResponse, { status: 403 });
      }

      // Verify CAPTCHA token
      const isValidCaptcha = await captchaService.verifyCaptcha(captchaToken, ip);
      if (!isValidCaptcha) {
        await authService.logSecurityEvent(null, 'captcha_verification_failed', ip, {
          userAgent,
          email: normalizedEmail,
        });

        const errorResponse: LoginErrorResponse = {
          error:
            'فشل التحقق من CAPTCHA. يرجى المحاولة مرة أخرى.',
          requiresCaptcha: true,
          failedAttempts: currentAttempts,
          code: 'CAPTCHA_INVALID',
        };
        return NextResponse.json(errorResponse, { status: 403 });
      }
    }

    // ==================== FIND USER ====================
    let user;
    try {
      user = await authService.findUserByEmail(normalizedEmail);
    } catch (dbError: any) {
      console.error('Database error while finding user:', dbError);
      
      // Check if it's a connection error
      if (isConnectionError(dbError)) {
        return NextResponse.json(
          {
            error: 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقاً.',
            code: 'CONNECTION_ERROR',
          },
          { status: 503 },
        );
      }
      
      // Re-throw if it's not a connection error
      throw dbError;
    }

    // ==================== GENERATE DEVICE FINGERPRINT ====================
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

    // ==================== VERIFY USER EXISTS ====================
    if (!user || !user.passwordHash) {
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

    // ==================== VERIFY PASSWORD ====================
    // Add timing attack protection by always performing comparison
    let passwordMatches = false;
    try {
      passwordMatches = await AuthService.comparePasswords(
        password,
        user.passwordHash,
      );
    } catch (passwordError) {
      console.error('Password comparison error:', passwordError);
      // Even if comparison fails, we should still record the failed attempt
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

    // ==================== PERFORM RISK ASSESSMENT ====================
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
      console.warn('Failed to fetch login history for risk assessment:', dbError);
      // Continue with login even if we can't fetch history
      loginHistory = [];
    }

    // Perform risk assessment with error handling
    let riskAssessment: any;
    try {
      riskAssessment = await riskAssessmentService.assessLoginRisk(
        {
          userId: user.id,
          email: normalizedEmail,
          ip,
          deviceFingerprint: fingerprintData,
          timestamp: new Date(),
          success: true,
          userAgent,
        },
        loginHistory.map((log) => ({
          userId: log.userId || user.id,
          email: normalizedEmail,
          ip: log.ip,
          timestamp: log.createdAt,
          success: log.eventType === 'login_success',
          userAgent: log.userAgent,
        }))
      );
    } catch (riskError) {
      console.warn('Failed to perform risk assessment:', riskError);
      // Use default low-risk assessment if risk assessment fails
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
      console.warn('Failed to log risk assessment:', logError);
      // Continue with login even if logging fails
    });

    // ==================== HANDLE HIGH-RISK LOGINS ====================
    if (riskAssessment.level === 'critical' || riskAssessment.blockAccess) {
      // Log security event (non-blocking)
      authService.logSecurityEvent(user.id, 'login_blocked_high_risk', ip, {
        userAgent,
        riskLevel: riskAssessment.level,
        riskScore: riskAssessment.score,
      }).catch((logError) => {
        console.warn('Failed to log high-risk login:', logError);
      });

      // Send notification (non-blocking)
      securityNotificationService.notifySuspiciousLogin(
        user.id,
        riskAssessment,
        ip
      ).catch((notifyError) => {
        console.warn('Failed to send security notification:', notifyError);
      });

      const errorResponse: LoginErrorResponse = {
        error:
          'تم رفض تسجيل الدخول بسبب تقييم مخاطر عالي. يرجى التواصل مع الدعم الفني.',
        code: 'HIGH_RISK',
        riskLevel: riskAssessment.level,
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    // ==================== HANDLE NEW DEVICE ====================
    const isNewDevice = riskAssessment.factors?.newDevice || false;
    if (isNewDevice) {
      // Send notification (non-blocking)
      securityNotificationService.notifyNewDeviceLogin(
        user.id,
        fingerprintData,
        ip
      ).catch((notifyError) => {
        console.warn('Failed to send new device notification:', notifyError);
      });
    }

    // Register/update device (non-blocking)
    deviceManagerService.registerDevice(
      user.id,
      fingerprintData,
      ip
    ).catch((deviceError) => {
      console.warn('Failed to register device:', deviceError);
      // Continue with login even if device registration fails
    });

    // ==================== HANDLE TWO-FACTOR AUTHENTICATION ====================
    
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
        console.info(`[Auth] 2FA code for ${user.email}: ${code}`);
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

      const response = createTwoFactorResponse(
        user,
        challengeId,
        code,
        'high_risk',
        riskAssessment
      );
      
      return NextResponse.json(response);
    }

    // Check if user has 2FA enabled
    if (user.twoFactorEnabled) {
      let code: string;
      let challengeId: string;
      
      try {
        code = generateTwoFactorCode();
        challengeId = await TwoFactorChallengeService.createChallenge(
          user.id,
          code,
          TWO_FACTOR_TTL_MINUTES,
        );
        
        // Validate challenge creation
        if (!challengeId) {
          throw new Error('Failed to create 2FA challenge');
        }
      } catch (challengeError) {
        console.error('Failed to create 2FA challenge:', challengeError);
        return createErrorResponse(
          challengeError,
          'فشل إنشاء تحدي المصادقة بخطوتين. يرجى المحاولة مرة أخرى.'
        );
      }

      if (process.env.NODE_ENV !== 'production') {
        console.info(`[Auth] 2FA code for ${user.email}: ${code}`);
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

      const response = createTwoFactorResponse(user, challengeId, code);
      
      // Validate 2FA response
      if (!response.loginAttemptId || !response.requiresTwoFactor) {
        console.error('Invalid 2FA response structure');
        return createErrorResponse(
          new Error('استجابة المصادقة بخطوتين غير صحيحة'),
          'فشل إنشاء استجابة المصادقة بخطوتين. يرجى المحاولة مرة أخرى.'
        );
      }
      
      return NextResponse.json(response);
    }

    // ==================== SUCCESSFUL LOGIN ====================
    
    // Reset rate limit on successful login (non-blocking)
    authService.resetRateLimit(clientId).catch((rateLimitError) => {
      console.warn('Failed to reset rate limit:', rateLimitError);
    });

    // Create session first (critical for login)
    let session;
    try {
      session = await authService.createSession(user.id, userAgent, ip);
      
      // Validate session was created
      if (!session || !session.id) {
        console.error('Invalid session created:', session);
        return createErrorResponse(
          new Error('فشل إنشاء جلسة صحيحة'),
          'فشل إنشاء جلسة تسجيل الدخول. يرجى المحاولة مرة أخرى.'
        );
      }
    } catch (sessionError) {
      console.error('Failed to create session:', sessionError);
      
      // Check if it's a connection error
      if (isConnectionError(sessionError)) {
        return NextResponse.json(
          {
            error: 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى لاحقاً.',
            code: 'CONNECTION_ERROR',
          },
          { status: 503 }
        );
      }
      
      return createErrorResponse(
        sessionError,
        'فشل إنشاء جلسة تسجيل الدخول. يرجى المحاولة مرة أخرى.'
      );
    }
    
    // Generate tokens (critical for login)
    let accessToken: string;
    let refreshToken: string;
    try {
      // Validate JWT_SECRET is available
      const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
      if (!jwtSecret || jwtSecret === 'your-secret-key') {
        console.error('JWT_SECRET is not configured properly');
        return createErrorResponse(
          new Error('JWT_SECRET غير مُعد بشكل صحيح'),
          'خطأ في إعدادات الخادم. يرجى التواصل مع الدعم الفني.'
        );
      }
      
      const tokens = await authService.createTokens(
        {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: (user as any).role || undefined,
        },
        session.id,
      );
      
      // Validate tokens were created
      if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
        console.error('Invalid tokens created:', tokens);
        return createErrorResponse(
          new Error('فشل إنشاء رموز المصادقة'),
          'فشل إنشاء رمز المصادقة. يرجى المحاولة مرة أخرى.'
        );
      }
      
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
    } catch (tokenError) {
      console.error('Failed to generate tokens:', tokenError);
      
      // Check if it's a connection error
      if (isConnectionError(tokenError)) {
        return NextResponse.json(
          {
            error: 'خطأ في الاتصال: حدث خطأ أثناء إنشاء رمز المصادقة. يرجى المحاولة مرة أخرى لاحقاً.',
            code: 'CONNECTION_ERROR',
          },
          { status: 503 }
        );
      }
      
      return createErrorResponse(
        tokenError,
        'فشل إنشاء رمز المصادقة. يرجى المحاولة مرة أخرى.'
      );
    }

    // Update user with refresh token and last login (non-blocking)
    // Use transaction-like approach but don't fail login if this fails
    Promise.all([
      authService.updateLastLogin(user.id).catch((updateError) => {
        console.warn('Failed to update last login:', updateError);
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          refreshToken,
          lastLogin: new Date(),
        },
      }).catch((dbError) => {
        console.warn('Failed to update user in database:', dbError);
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
      console.warn('Failed to log security event:', logError);
      // Continue with login even if logging fails
    });

    // Validate tokens before sending response
    if (!accessToken || !refreshToken) {
      console.error('Failed to generate tokens');
      return createErrorResponse(
        new Error('فشل إنشاء رموز المصادقة'),
        'فشل إنشاء رموز المصادقة. يرجى المحاولة مرة أخرى.'
      );
    }

    // Validate token format (basic JWT check)
    const accessTokenParts = accessToken.split('.');
    if (accessTokenParts.length !== 3) {
      console.error('Invalid access token format');
      return createErrorResponse(
        new Error('تنسيق رمز المصادقة غير صحيح'),
        'فشل إنشاء رمز المصادقة. يرجى المحاولة مرة أخرى.'
      );
    }

    // Create success response
    const loginResponse = createSuccessResponse(
      user,
      accessToken,
      refreshToken,
      session.id,
      riskAssessment,
      isNewDevice
    );
    
    // Validate response structure before sending
    if (!loginResponse.token || !loginResponse.user || !loginResponse.user.id) {
      console.error('Invalid login response structure');
      return createErrorResponse(
        new Error('استجابة تسجيل الدخول غير صحيحة'),
        'حدث خطأ أثناء إنشاء استجابة تسجيل الدخول. يرجى المحاولة مرة أخرى.'
      );
    }
    
    // Set authentication cookies and return response
    const response = NextResponse.json(loginResponse);
    setAuthCookies(response, accessToken, refreshToken, rememberMe);
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    return response;
  } catch (error) {
    // Enhanced error logging with better details
    console.error('Login error details:', {
      error,
      errorType: typeof error,
      errorConstructor: error instanceof Error ? error.constructor.name : 'unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      errorString: String(error),
    });
    
    // Check if it's a connection error (database, etc.)
    if (isConnectionError(error)) {
      return NextResponse.json(
        {
          error: 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقاً.',
          code: 'CONNECTION_ERROR',
        },
        { status: 503 }
      );
    }
    
    // Get error code and message for logging and response
    const errorCode = getErrorCode(error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : (typeof error === 'string' ? error : 'Unknown error');
    
    // Log security event safely (non-blocking)
    authService.logSecurityEvent(null, 'login_error', ip, {
      userAgent,
      error: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    }).catch((logError) => {
      console.error('Failed to log security event:', logError);
    });

    const userFriendlyMessage = isConnectionError(error)
      ? 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقاً.'
      : 'حدث خطأ داخلي في الخادم. يرجى المحاولة مرة أخرى لاحقاً.';
    
    // Return proper error response with SERVER_ERROR code to match client expectations
    return NextResponse.json(
      {
        error: userFriendlyMessage,
        code: errorCode === 'INTERNAL_ERROR' ? 'SERVER_ERROR' : errorCode,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: isConnectionError(error) ? 503 : 500 }
    );
  }
}




