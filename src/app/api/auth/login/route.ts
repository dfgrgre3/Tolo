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

const loginSchema = z.object({
  email: z.string().email('ط§ظ„ط¨ط±ظٹط¯ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ ط؛ظٹط± طµط§ظ„ط­'),
  password: z
    .string()
    .min(8, 'ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ظٹط¬ط¨ ط£ظ† طھطھظƒظˆظ† ظ…ظ† 8 ط£ط­ط±ظپ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„'),
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
    const redis = getRedisClient();
    const rateLimitService = new RateLimitingService(redis);
    const initialRateLimitStatus = await rateLimitService.checkRateLimit(clientId);

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

      return NextResponse.json(
        {
          error:
            'تم تعليق محاولات تسجيل الدخول مؤقتاً بسبب محاولات متكررة. يمكنك المحاولة مرة أخرى بعد انتهاء العد التنازلي.',
          code: 'RATE_LIMITED',
          retryAfterSeconds,
          lockedUntil: lockoutUntil ? new Date(lockoutUntil).toISOString() : undefined,
          attempts: initialRateLimitStatus.attempts,
        },
        { status: 429 },
      );
    }
    const body = await request.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            'تم تعليق محاولات تسجيل الدخول مؤقتاً بسبب محاولات متكررة. يمكنك المحاولة مرة أخرى بعد انتهاء العد التنازلي.',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email, password, rememberMe, deviceFingerprint, captchaToken } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const rateLimitStatus = initialRateLimitStatus;
    const currentAttempts = rateLimitStatus.attempts || 0;

    // Check if CAPTCHA is required and verify it if provided
    if (captchaService.shouldRequireCaptcha(currentAttempts)) {
      if (!captchaToken) {
        return NextResponse.json(
          {
            error:
            'تم تعليق محاولات تسجيل الدخول مؤقتاً بسبب محاولات متكررة. يمكنك المحاولة مرة أخرى بعد انتهاء العد التنازلي.',
            requiresCaptcha: true,
            failedAttempts: currentAttempts,
            code: 'CAPTCHA_REQUIRED',
          },
          { status: 403 },
        );
      }

      const isValidCaptcha = await captchaService.verifyCaptcha(captchaToken, ip);
      if (!isValidCaptcha) {
        await authService.logSecurityEvent(null, 'captcha_verification_failed', ip, {
          userAgent,
          email: normalizedEmail,
        });

        return NextResponse.json(
          {
            error:
            'تم تعليق محاولات تسجيل الدخول مؤقتاً بسبب محاولات متكررة. يمكنك المحاولة مرة أخرى بعد انتهاء العد التنازلي.',
            requiresCaptcha: true,
            failedAttempts: currentAttempts,
            code: 'CAPTCHA_INVALID',
          },
          { status: 403 },
        );
      }
    }

    const user = await authService.findUserByEmail(normalizedEmail);

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
      
      // Get updated failed attempts count
      const updatedRateLimitStatus = await rateLimitService.checkRateLimit(clientId);
      const updatedAttempts = (updatedRateLimitStatus.attempts || 0) + 1; // +1 for current failed attempt

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
      
      // Get updated failed attempts count
      const updatedRateLimitStatus = await rateLimitService.checkRateLimit(clientId);
      const updatedAttempts = (updatedRateLimitStatus.attempts || 0) + 1; // +1 for current failed attempt

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

    // Perform risk assessment
    const loginHistory = await prisma.securityLog.findMany({
      where: {
        userId: user.id,
        eventType: { in: ['login_success', 'login_failed'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

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

      return NextResponse.json(
        {
          error:
            'تم تعليق محاولات تسجيل الدخول مؤقتاً بسبب محاولات متكررة. يمكنك المحاولة مرة أخرى بعد انتهاء العد التنازلي.',
          code: 'HIGH_RISK',
          riskLevel: riskAssessment.level,
        },
        { status: 403 }
      );
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

      return NextResponse.json({
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
        ...(process.env.NODE_ENV !== 'production' ? { debugCode: code } : {}),
      });
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

      return NextResponse.json({
        requiresTwoFactor: true,
        loginAttemptId: challengeId,
        expiresAt: new Date(
          Date.now() + TWO_FACTOR_TTL_MINUTES * 60 * 1000,
        ).toISOString(),
        methods: ['email'],
        ...(process.env.NODE_ENV !== 'production' ? { debugCode: code } : {}),
      });
    }

    await authService.resetRateLimit(clientId);
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

    await prisma.user
      .update({
        where: { id: user.id },
        data: {
          refreshToken,
          lastLogin: new Date(),
        },
      })
      .catch(() => undefined);

    await authService.logSecurityEvent(user.id, 'login_success', ip, {
      userAgent,
      sessionId: session.id,
    });

    const response = NextResponse.json({
      message: 'طھظ… طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط¨ظ†ط¬ط§ط­.',
      token: accessToken,
      refreshToken,
      sessionId: session.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: (user as any).role || 'user',
        twoFactorEnabled: user.twoFactorEnabled,
        lastLogin: user.lastLogin,
      },
      riskAssessment: {
        level: riskAssessment.level,
        score: riskAssessment.score,
      },
      isNewDevice,
    });

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
    const isConnectionError = 
      errorMessage.includes('connect') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('database') ||
      errorMessage.includes('prisma') ||
      errorMessage.includes('timeout');

    return NextResponse.json(
      {
        error: isConnectionError
          ? 'ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„: ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„ط§طھطµط§ظ„ ط¨ط§ظ„ط®ط§ط¯ظ…. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹.'
          : 'ط­ط¯ط« ط®ط·ط£ ط؛ظٹط± ظ…طھظˆظ‚ط¹ ط£ط«ظ†ط§ط، ظ…ط¹ط§ظ„ط¬ط© ط·ظ„ط¨ طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„. ط­ط§ظˆظ„ ظ…ط±ط© ط£ط®ط±ظ‰ ظ„ط§ط­ظ‚ط§ظ‹.',
        code: isConnectionError ? 'CONNECTION_ERROR' : 'INTERNAL_ERROR',
      },
      { status: isConnectionError ? 503 : 500 },
    );
  }
}




