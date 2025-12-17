import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { SignJWT, jwtVerify } from 'jose';
import { TextEncoder } from 'util';
import { TwoFactorChallengeService } from '@/lib/services/auth-challenges-service';
import { authService } from '@/lib/services/auth-service';
import { verifyTOTP, disableTOTP, generateSecret } from '@/lib/two-factor/totp-service';
import { verifyAndConsumeRecoveryCode, generateRecoveryCodes } from '@/lib/two-factor/recovery-codes';
import { securityLogger } from '@/lib/security-logger';
import { securityNotificationService } from '@/lib/security/security-notifications';
import type { TwoFactorVerifyRequest, TwoFactorVerifyResponse, TwoFactorErrorResponse } from '@/types/api/auth';
import { setAuthCookies, createErrorResponse } from '@/app/api/auth/_helpers';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { getJWTSecret } from '@/lib/env-validation';
import type { Prisma } from '@prisma/client';

// Type for user with 2FA fields
type UserWith2FA = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    name: true;
    role: true;
    twoFactorEnabled: true;
    twoFactorSecret: true;
    recoveryCodes: true;
  }
}>;

// Security: JWT_SECRET is required - no fallback values allowed
let JWT_SECRET: Uint8Array | null = null;

function getJWTSecretSafe(): Uint8Array {
  if (!JWT_SECRET) {
    const secretString = getJWTSecret();
    JWT_SECRET = new TextEncoder().encode(secretString);
  }
  return JWT_SECRET;
}

// Generate a new 2FA verification code
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Generate a 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Generate a unique ID for this login attempt
      const loginAttemptId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // Store the attempt in database (expires in 10 minutes)
      await TwoFactorChallengeService.createChallenge('', code, 10);

      return NextResponse.json({
        loginAttemptId
        // Removed code from response for security - it should only be sent via email/SMS
      });
    } catch (error) {
      logger.error('Error generating 2FA code:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// Combined POST handler for both 2FA login verification and management
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json();
      const { loginAttemptId, code, action, userId, backupCode } = body;

      // If loginAttemptId is provided, this is a login verification request
      if (loginAttemptId) {
        // Verify 2FA code for login
        if (!code) {
          return NextResponse.json(
            { error: 'Code is required' },
            { status: 400 }
          );
        }

        // Enhanced code validation with comprehensive checks
        if (!code || typeof code !== 'string') {
          const errorResponse: TwoFactorErrorResponse = {
            error: 'رمز التحقق مطلوب',
            code: 'MISSING_CODE',
          };
          return NextResponse.json(errorResponse, { status: 400 });
        }

        const trimmedCode = code.trim();
        if (trimmedCode.length === 0) {
          const errorResponse: TwoFactorErrorResponse = {
            error: 'رمز التحقق لا يمكن أن يكون فارغاً',
            code: 'EMPTY_CODE',
          };
          return NextResponse.json(errorResponse, { status: 400 });
        }

        // Validate code format (must be exactly 6 digits)
        if (trimmedCode.length !== 6 || !/^\d{6}$/.test(trimmedCode)) {
          const errorResponse: TwoFactorErrorResponse = {
            error: 'رمز التحقق يجب أن يكون مكون من 6 أرقام',
            code: 'INVALID_CODE_FORMAT',
          };
          return NextResponse.json(errorResponse, { status: 400 });
        }

        // Validate loginAttemptId format
        if (!loginAttemptId || typeof loginAttemptId !== 'string' || loginAttemptId.trim().length === 0) {
          const errorResponse: TwoFactorErrorResponse = {
            error: 'معرف محاولة تسجيل الدخول مطلوب',
            code: 'MISSING_LOGIN_ATTEMPT_ID',
          };
          return NextResponse.json(errorResponse, { status: 400 });
        }

        const trimmedLoginAttemptId = loginAttemptId.trim();
        if (trimmedLoginAttemptId.length < 10 || trimmedLoginAttemptId.length > 100) {
          const errorResponse: TwoFactorErrorResponse = {
            error: 'معرف محاولة تسجيل الدخول غير صحيح',
            code: 'INVALID_LOGIN_ATTEMPT_ID',
          };
          return NextResponse.json(errorResponse, { status: 400 });
        }

        // Verify and consume the challenge from database (with timeout)
        // Use trimmed values for consistency
        const challengePromise = TwoFactorChallengeService.verifyAndConsumeChallenge(trimmedLoginAttemptId, trimmedCode);
        const timeoutPromise = new Promise<{ valid: false }>((resolve) => {
          setTimeout(() => resolve({ valid: false }), 5000); // 5 second timeout
        });

        const challengeResult = await Promise.race([challengePromise, timeoutPromise]);

        if (!challengeResult.valid) {
          const errorResponse: TwoFactorErrorResponse = {
            error: 'رمز التحقق غير صحيح أو منتهي الصلاحية',
            code: 'INVALID_OR_EXPIRED',
          };
          return NextResponse.json(errorResponse, { status: 400 });
        }

        if (!challengeResult.userId) {
          const errorResponse: TwoFactorErrorResponse = {
            error: 'رمز التحقق غير صحيح أو منتهي الصلاحية',
            code: 'INVALID_OR_EXPIRED',
          };
          return NextResponse.json(errorResponse, { status: 400 });
        }

        // Fetch user with timeout
        const userPromise = prisma.user.findUnique({
          where: { id: challengeResult.userId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            twoFactorEnabled: true,
            lastLogin: true,
          }
        });

        const userTimeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 3000); // 3 second timeout
        });

        const user = await Promise.race([userPromise, userTimeoutPromise]);

        if (!user) {
          const errorResponse: TwoFactorErrorResponse = {
            error: 'المستخدم غير موجود',
            code: 'USER_NOT_FOUND',
          };
          return NextResponse.json(errorResponse, { status: 404 });
        }

        const ip = authService.getClientIP(req);
        const userAgent = authService.getUserAgent(req);
        const clientId = `${ip}-${userAgent}`;
        const rememberDevice = Boolean(body.trustDevice);
        const loginTimestamp = new Date();

        await authService.resetRateLimit(clientId);

        // Create tokens first to get a refresh token
        const tempTokens = await authService.createTokens({
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: user.role || undefined,
        });

        const session = await authService.createSession(user.id, userAgent, ip, tempTokens.refreshToken);
        const { accessToken, refreshToken } = await authService.createTokens(
          {
            id: user.id,
            email: user.email,
            name: user.name || undefined,
            role: user.role || undefined,
          },
          session.id,
        );

        // Update session with final refresh token
        await prisma.session.update({
          where: { id: session.id },
          data: { refreshToken }
        });

        // Update user (non-blocking, with timeout)
        Promise.allSettled([
          prisma.user.update({
            where: { id: user.id },
            data: {
              lastLogin: loginTimestamp,
            },
          }),
          authService.logSecurityEvent(user.id, 'two_factor_verified', ip, {
            userAgent,
            sessionId: session.id,
          }),
        ]).catch(() => {
          // Non-critical errors - login can proceed
        });

        const twoFactorResponse: TwoFactorVerifyResponse = {
          message: 'تم التحقق من الرمز بنجاح.',
          user: {
            id: user.id,
            email: user.email,
            name: user.name || undefined,
            role: user.role || 'user',
            emailVerified: false, // Add if available from user
            twoFactorEnabled: user.twoFactorEnabled || false,
            lastLogin: loginTimestamp,
          },
          token: accessToken,
          refreshToken,
          sessionId: session.id,
        };

        const response = NextResponse.json(twoFactorResponse);
        setAuthCookies(response, accessToken, refreshToken, rememberDevice);
        return response;
      }

      // Otherwise, handle 2FA management actions
      if (!action) {
        return NextResponse.json(
          { error: 'Action is required for 2FA management' },
          { status: 400 }
        );
      }

      // Get user ID from token if not provided
      let targetUserId = userId;
      if (!targetUserId) {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }

        const token = authHeader.substring(7);
        const { payload } = await jwtVerify(token, getJWTSecretSafe());

        targetUserId = payload.userId as string;
      }

      // Get user with required 2FA fields
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          twoFactorEnabled: true,
          twoFactorSecret: true,
          recoveryCodes: true,
        }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Handle different actions
      switch (action) {
        case 'setup':
          return await handleSetup2FA(user);
        case 'verify':
          return await handleVerify2FA(user, code, req);
        case 'disable':
          return await handleDisable2FA(user, code, req);
        case 'backup-code':
          return await handleBackupCode(user, backupCode, req);
        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          );
      }
    } catch (error) {
      logger.error('Two-factor authentication error:', error);
      return createErrorResponse(
        error,
        'حدث خطأ غير متوقع أثناء معالجة طلب التحقق ثنائي العامل. حاول مرة أخرى لاحقاً.'
      );
    }
  });
}

// Handle 2FA setup
async function handleSetup2FA(user: UserWith2FA) {
  try {
    // Generate a cryptographically secure secret key using crypto.randomBytes
    const secret = generateSecret();

    // Generate cryptographically secure backup codes
    const backupCodes = generateRecoveryCodes();

    // Store the secret temporarily (not enabled yet)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secret,
        recoveryCodes: JSON.stringify(backupCodes)
      }
    });

    // Return the secret and backup codes
    // Note: The frontend should generate a QR code from the secret for easy setup
    return NextResponse.json({
      secret,
      backupCodes,
      message: '2FA setup initiated. Please verify with your authenticator app.'
    });
  } catch (error) {
    logger.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
}

// Handle 2FA verification
async function handleVerify2FA(user: UserWith2FA, code: string, request: NextRequest) {
  try {
    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA not set up for this user' },
        { status: 400 }
      );
    }

    // Verify TOTP code using real implementation
    const isValid = verifyTOTP(user.twoFactorSecret, code);

    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);

    if (!isValid) {
      // Log failed verification attempt
      await Promise.all([
        authService.logSecurityEvent(user.id, 'two_factor_verify_failed', ip, {
          userAgent,
          method: 'TOTP',
        }),
        securityLogger.logEvent({
          userId: user.id,
          eventType: 'TWO_FACTOR_FAILED',
          ip,
          userAgent,
          metadata: { method: 'TOTP' },
        }),
      ]).catch(() => {
        // Non-blocking log failure
      });

      return NextResponse.json(
        { error: 'رمز التحقق غير صحيح' },
        { status: 400 }
      );
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true }
    });

    // Log security events
    await Promise.all([
      authService.logSecurityEvent(user.id, 'two_factor_enabled', ip, {
        userAgent,
        method: 'TOTP',
      }),
      securityLogger.logEvent({
        userId: user.id,
        eventType: 'TWO_FACTOR_ENABLED',
        ip,
        userAgent,
        metadata: { method: 'TOTP' },
      }),
      securityNotificationService.notify2FAStatusChange(user.id, true, ip),
    ]).catch(() => {
      // Non-blocking log failure
    });

    return NextResponse.json({
      message: 'تم تفعيل المصادقة الثنائية بنجاح'
    });
  } catch (error) {
    logger.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}

// Handle 2FA disabling
async function handleDisable2FA(user: UserWith2FA, code: string, request: NextRequest) {
  try {
    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is not enabled for this user' },
        { status: 400 }
      );
    }

    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);

    // Try TOTP verification first
    let isValid = false;
    if (user.twoFactorSecret) {
      isValid = verifyTOTP(user.twoFactorSecret, code);
    }

    // If TOTP verification failed, try recovery code
    if (!isValid) {
      isValid = await verifyAndConsumeRecoveryCode(user.id, code);
    }

    if (!isValid) {
      // Log failed disable attempt
      await Promise.all([
        authService.logSecurityEvent(user.id, 'two_factor_disable_failed', ip, {
          userAgent,
          reason: 'invalid_code',
        }),
        securityLogger.logEvent({
          userId: user.id,
          eventType: 'TWO_FACTOR_DISABLED',
          ip,
          userAgent,
          metadata: { reason: 'invalid_code' },
        }),
      ]).catch(() => {
        // Non-blocking log failure
      });

      return NextResponse.json(
        { error: 'رمز التحقق غير صحيح' },
        { status: 400 }
      );
    }

    // Disable 2FA using proper service (code already verified)
    await disableTOTP(user.id);

    // Log security events
    await Promise.all([
      authService.logSecurityEvent(user.id, 'two_factor_disabled', ip, {
        userAgent,
      }),
      securityLogger.logEvent({
        userId: user.id,
        eventType: 'TWO_FACTOR_DISABLED',
        ip,
        userAgent,
      }),
      securityNotificationService.notify2FAStatusChange(user.id, false, ip),
    ]).catch(() => {
      // Non-blocking log failure
    });

    return NextResponse.json({
      message: 'تم إلغاء تفعيل المصادقة الثنائية بنجاح'
    });
  } catch (error) {
    logger.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}

// Handle backup code verification
async function handleBackupCode(user: UserWith2FA, backupCode: string, request: NextRequest) {
  try {
    if (!backupCode) {
      return NextResponse.json(
        { error: 'Backup code is required' },
        { status: 400 }
      );
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is not enabled for this user' },
        { status: 400 }
      );
    }

    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);

    // Verify and consume recovery code using proper service
    const isValid = await verifyAndConsumeRecoveryCode(user.id, backupCode);

    if (!isValid) {
      // Log failed backup code attempt
      await Promise.all([
        authService.logSecurityEvent(user.id, 'two_factor_backup_code_failed', ip, {
          userAgent,
        }),
        securityLogger.logEvent({
          userId: user.id,
          eventType: 'TWO_FACTOR_FAILED',
          ip,
          userAgent,
        }),
      ]).catch(() => {
        // Non-blocking log failure
      });

      return NextResponse.json(
        { error: 'رمز الاسترداد غير صحيح أو مستخدم' },
        { status: 400 }
      );
    }

    // Get remaining codes count
    const userWithCodes = await prisma.user.findUnique({
      where: { id: user.id },
      select: { recoveryCodes: true },
    });

    const remainingCodes = userWithCodes?.recoveryCodes
      ? JSON.parse(userWithCodes.recoveryCodes as string).length
      : 0;

    // Log security events
    await Promise.all([
      authService.logSecurityEvent(user.id, 'two_factor_backup_code_used', ip, {
        userAgent,
        remainingCodes,
      }),
      securityLogger.logEvent({
        userId: user.id,
        eventType: 'TWO_FACTOR_SUCCESS',
        ip,
        userAgent,
        metadata: { remainingCodes },
      }),
    ]).catch(() => {
      // Non-blocking log failure
    });

    // Generate a new token for the user
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role || 'user'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(getJWTSecretSafe());

    return NextResponse.json({
      message: 'تم التحقق من رمز الاسترداد بنجاح',
      token,
      remainingBackupCodes: remainingCodes
    });
  } catch (error) {
    logger.error('Backup code verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify backup code' },
      { status: 500 }
    );
  }
}



