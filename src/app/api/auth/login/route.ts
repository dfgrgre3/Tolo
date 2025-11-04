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

const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z
    .string()
    .min(8, 'كلمة المرور يجب أن تتكون من 8 أحرف على الأقل'),
  rememberMe: z.boolean().optional(),
  deviceFingerprint: z.any().optional(),
  captchaToken: z.string().optional(),
});

const TWO_FACTOR_TTL_MINUTES = 10;

const buildClientId = (ip: string, userAgent: string) =>
  `${ip || 'unknown'}-${userAgent || 'unknown'}`;

const generateTwoFactorCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export async function POST(request: NextRequest) {
  const ip = authService.getClientIP(request);
  const userAgent = authService.getUserAgent(request);
  const clientId = buildClientId(ip, userAgent);

  try {
    const { RateLimitingService } = await import('@/lib/rate-limiting-service');
    const { getRedisClient } = await import('@/lib/redis');
    
    let rateLimitService: RateLimitingService;
    let initialRateLimitStatus;
    
    try {
      const redis = await getRedisClient();
      rateLimitService = new RateLimitingService(redis);
      initialRateLimitStatus = await rateLimitService.checkRateLimit(clientId);
    } catch (redisError) {
      // If Redis is unavailable, allow the request but log the error
      console.warn('Redis unavailable, proceeding without rate limiting:', redisError);
      // Create a mock rate limit status that allows the request
      initialRateLimitStatus = { allowed: true, attempts: 0 };
      rateLimitService = null as any; // Will be handled gracefully
    }

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
    const body = await request.json().catch(() => ({}));
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
    const normalizedEmail = email.trim().toLowerCase();

    const rateLimitStatus = initialRateLimitStatus;
    const currentAttempts = rateLimitStatus.attempts || 0;

    // Check if CAPTCHA is required and verify it if provided
    if (captchaService.shouldRequireCaptcha(currentAttempts)) {
      if (!captchaToken) {
      const errorResponse: LoginErrorResponse = {
        error:
          'تم تعليق محاولات تسجيل الدخول مؤقتاً بسبب محاولات متكررة. يمكنك المحاولة مرة أخرى بعد انتهاء العد التنازلي.',
        requiresCaptcha: true,
        failedAttempts: currentAttempts,
        code: 'CAPTCHA_REQUIRED',
      };
      return NextResponse.json(errorResponse, { status: 403 });
      }

      const isValidCaptcha = await captchaService.verifyCaptcha(captchaToken, ip);
      if (!isValidCaptcha) {
        await authService.logSecurityEvent(null, 'captcha_verification_failed', ip, {
          userAgent,
          email: normalizedEmail,
        });

        const errorResponse: LoginErrorResponse = {
          error:
            'تم تعليق محاولات تسجيل الدخول مؤقتاً بسبب محاولات متكررة. يمكنك المحاولة مرة أخرى بعد انتهاء العد التنازلي.',
          requiresCaptcha: true,
          failedAttempts: currentAttempts,
          code: 'CAPTCHA_INVALID',
        };
        return NextResponse.json(errorResponse, { status: 403 });
      }
    }

    // Find user by email (with error handling)
    let user;
    try {
      user = await authService.findUserByEmail(normalizedEmail);
    } catch (dbError: any) {
      console.error('Database error while finding user:', dbError);
      
      // Check if it's a connection error
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      const isConnectionError = 
        errorMessage.includes('connect') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('database') ||
        errorMessage.includes('prisma') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('P1001') || // Prisma connection error code
        errorMessage.includes('P1017'); // Prisma server closed connection
      
      if (isConnectionError) {
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

    // Generate device fingerprint from client data or user agent
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

    if (!user || !user.passwordHash) {
      await authService.recordFailedAttempt(clientId);
      await authService.logSecurityEvent(null, 'login_failed', ip, {
        userAgent,
        reason: 'user_not_found',
        email: normalizedEmail,
      });

      // Record failed attempt first
      await authService.recordFailedAttempt(clientId);
      
      // Get updated failed attempts count (with Redis fallback)
      let updatedAttempts = 1;
      try {
        if (rateLimitService) {
          const updatedRateLimitStatus = await rateLimitService.checkRateLimit(clientId);
          updatedAttempts = (updatedRateLimitStatus.attempts || 0) + 1; // +1 for current failed attempt
        }
      } catch (redisError) {
        console.warn('Redis unavailable for rate limit check:', redisError);
        updatedAttempts = 1; // Default to 1 attempt
      }

      // Require CAPTCHA after 3 failed attempts
      if (captchaService.shouldRequireCaptcha(updatedAttempts)) {
        return NextResponse.json(
          {
            error:
            'تم تعليق محاولات تسجيل الدخول مؤقتاً بسبب محاولات متكررة. يمكنك المحاولة مرة أخرى بعد انتهاء العد التنازلي.',
            requiresCaptcha: true,
            failedAttempts: updatedAttempts,
            code: 'CAPTCHA_REQUIRED',
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        { error: 'ط¨ظٹط§ظ†ط§طھ طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط؛ظٹط± طµط­ظٹط­ط©.' },
        { status: 401 },
      );
    }

    const passwordMatches = await AuthService.comparePasswords(
      password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      await authService.recordFailedAttempt(clientId);
      await authService.logSecurityEvent(user.id, 'login_failed', ip, {
        userAgent,
        reason: 'invalid_password',
      });

      // Record failed attempt first
      await authService.recordFailedAttempt(clientId);
      
      // Get updated failed attempts count (with Redis fallback)
      let updatedAttempts = 1;
      try {
        if (rateLimitService) {
          const updatedRateLimitStatus = await rateLimitService.checkRateLimit(clientId);
          updatedAttempts = (updatedRateLimitStatus.attempts || 0) + 1; // +1 for current failed attempt
        }
      } catch (redisError) {
        console.warn('Redis unavailable for rate limit check:', redisError);
        updatedAttempts = 1; // Default to 1 attempt
      }

      // Require CAPTCHA after 3 failed attempts
      if (captchaService.shouldRequireCaptcha(updatedAttempts)) {
        return NextResponse.json(
          {
            error:
            'تم تعليق محاولات تسجيل الدخول مؤقتاً بسبب محاولات متكررة. يمكنك المحاولة مرة أخرى بعد انتهاء العد التنازلي.',
            requiresCaptcha: true,
            failedAttempts: updatedAttempts,
            code: 'CAPTCHA_REQUIRED',
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        { error: 'ط¨ظٹط§ظ†ط§طھ طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط؛ظٹط± طµط­ظٹط­ط©.' },
        { status: 401 },
      );
    }

    // Perform risk assessment (with error handling)
    let loginHistory = [];
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

    const riskAssessment = await riskAssessmentService.assessLoginRisk(
      {
        userId: user.id,
        email: normalizedEmail,
        ip,
        deviceFingerprint: fingerprintData,
        timestamp: new Date(),
        success: true,
        userAgent,
      },
      loginHistory.map((log: any) => ({
        userId: log.userId!,
        email: normalizedEmail,
        ip: log.ip,
        timestamp: log.createdAt,
        success: log.eventType === 'login_success',
        userAgent: log.userAgent,
      }))
    );

    // Log risk assessment
    await authService.logSecurityEvent(user.id, 'risk_assessment', ip, {
      userAgent,
      riskLevel: riskAssessment.level,
      riskScore: riskAssessment.score,
      factors: riskAssessment.factors,
    });

    // Handle high-risk logins
    if (riskAssessment.level === 'critical' || riskAssessment.blockAccess) {
      await authService.logSecurityEvent(user.id, 'login_blocked_high_risk', ip, {
        userAgent,
        riskLevel: riskAssessment.level,
        riskScore: riskAssessment.score,
      });

      await securityNotificationService.notifySuspiciousLogin(
        user.id,
        riskAssessment,
        ip
      );

      const errorResponse: LoginErrorResponse = {
        error:
          'تم تعليق محاولات تسجيل الدخول مؤقتاً بسبب محاولات متكررة. يمكنك المحاولة مرة أخرى بعد انتهاء العد التنازلي.',
        code: 'HIGH_RISK',
        riskLevel: riskAssessment.level,
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    // Check if new device
    const isNewDevice = riskAssessment.factors.newDevice;
    if (isNewDevice) {
      await securityNotificationService.notifyNewDeviceLogin(
        user.id,
        fingerprintData,
        ip
      );
    }

    // Register/update device
    await deviceManagerService.registerDevice(
      user.id,
      fingerprintData,
      ip
    );

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

      const response: LoginResponse = {
        requiresTwoFactor: true,
        loginAttemptId: challengeId,
        expiresAt: new Date(
          Date.now() + TWO_FACTOR_TTL_MINUTES * 60 * 1000
        ).toISOString(),
        methods: ['email'],
        reason: 'high_risk',
        riskAssessment: {
          level: riskAssessment.level,
          score: riskAssessment.score,
          recommendations: riskAssessment.recommendations,
        },
        token: '', // Will be set after 2FA verification
        user: {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: (user as any).role || 'user',
          emailVerified: user.emailVerified || false,
          twoFactorEnabled: user.twoFactorEnabled || false,
        },
        ...(process.env.NODE_ENV !== 'production' ? { debugCode: code } : {}),
      };
      return NextResponse.json(response);
    }

    if (user.twoFactorEnabled) {
      const code = generateTwoFactorCode();
      const challengeId = await TwoFactorChallengeService.createChallenge(
        user.id,
        code,
        TWO_FACTOR_TTL_MINUTES,
      );

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

      const response: LoginResponse = {
        requiresTwoFactor: true,
        loginAttemptId: challengeId,
        expiresAt: new Date(
          Date.now() + TWO_FACTOR_TTL_MINUTES * 60 * 1000,
        ).toISOString(),
        methods: ['email'],
        token: '', // Will be set after 2FA verification
        user: {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: (user as any).role || 'user',
          emailVerified: user.emailVerified || false,
          twoFactorEnabled: user.twoFactorEnabled || false,
        },
        ...(process.env.NODE_ENV !== 'production' ? { debugCode: code } : {}),
      };
      return NextResponse.json(response);
    }

    // Reset rate limit (with error handling)
    try {
      await authService.resetRateLimit(clientId);
    } catch (rateLimitError) {
      console.warn('Failed to reset rate limit:', rateLimitError);
      // Continue with login even if rate limit reset fails
    }

    await authService.updateLastLogin(user.id);

    const session = await authService.createSession(user.id, userAgent, ip);
    const { accessToken, refreshToken } = await authService.createTokens(
      {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: (user as any).role || undefined,
      },
      session.id,
    );

    // Update user with refresh token and last login (with error handling)
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          refreshToken,
          lastLogin: new Date(),
        },
      });
    } catch (dbError) {
      console.error('Failed to update user in database:', dbError);
      // Continue with login even if database update fails
    }

    await authService.logSecurityEvent(user.id, 'login_success', ip, {
      userAgent,
      sessionId: session.id,
    });

    const loginResponse: LoginResponse = {
      message: 'تم تسجيل الدخول بنجاح.',
      token: accessToken,
      refreshToken,
      sessionId: session.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: (user as any).role || 'user',
        emailVerified: user.emailVerified || false,
        twoFactorEnabled: user.twoFactorEnabled || false,
        lastLogin: user.lastLogin || undefined,
      },
      riskAssessment: {
        level: riskAssessment.level,
        score: riskAssessment.score,
      },
      isNewDevice,
    };
    
    const response = NextResponse.json(loginResponse);

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    
    // Log security event safely
    try {
      await authService.logSecurityEvent(null, 'login_error', ip, {
        userAgent,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      console.error('Failed to log security event:', logError);
    }

    // Determine if it's a connection/database error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    const fullError = `${errorMessage} ${errorStack}`.toLowerCase();
    
    const isConnectionError = 
      fullError.includes('connect') ||
      fullError.includes('econnrefused') ||
      fullError.includes('etimedout') ||
      fullError.includes('database') ||
      fullError.includes('prisma') ||
      fullError.includes('timeout') ||
      fullError.includes('p1001') || // Prisma connection error
      fullError.includes('p1017') || // Prisma server closed connection
      fullError.includes('p2002') || // Prisma unique constraint
      fullError.includes('enotfound') ||
      fullError.includes('econnreset') ||
      fullError.includes('networkerror') ||
      fullError.includes('failed to fetch') ||
      fullError.includes('fetch error') ||
      fullError.includes('cannot read properties') ||
      fullError.includes('undefined');

    // Determine error code
    let errorCode = 'INTERNAL_ERROR';
    if (isConnectionError) {
      errorCode = 'CONNECTION_ERROR';
    } else if (fullError.includes('unauthorized') || fullError.includes('invalid')) {
      errorCode = 'AUTH_ERROR';
    } else if (fullError.includes('rate limit') || fullError.includes('too many')) {
      errorCode = 'RATE_LIMIT_ERROR';
    }

    // Return proper error response with detailed error code
    return NextResponse.json(
      {
        error: isConnectionError
          ? 'خطأ في الاتصال: حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى لاحقاً.'
          : 'حدث خطأ غير متوقع أثناء معالجة طلب تسجيل الدخول. حاول مرة أخرى لاحقاً.',
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: isConnectionError ? 503 : 500 },
    );
  }
}




