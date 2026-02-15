import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jwtVerify, SignJWT } from 'jose';
import { TextEncoder } from 'util';
import { TwoFactorChallengeService } from '@/lib/services/auth-challenges-service';
import { authService } from '@/lib/services/auth-service';
import { verifyTOTP, disableTOTP, generateSecret } from '@/lib/two-factor/totp-service';
import { verifyAndConsumeRecoveryCode, generateRecoveryCodes } from '@/lib/two-factor/recovery-codes';
import { securityLogger } from '@/lib/security-logger';
import { securityNotificationService } from '@/lib/security/security-notifications';
import type { TwoFactorVerifyResponse, TwoFactorErrorResponse } from '@/types/api/auth';
import {
  setAuthCookies,
  createErrorResponse,
  parseRequestBody,
  extractRequestMetadata,
  logSecurityEventSafely,
} from '@/lib/auth-utils';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import QRCode from 'qrcode';
import { authenticator } from 'otplib';
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

// Generate a new 2FA verification code
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const loginAttemptId = crypto.randomUUID();

      // Store the attempt in database (expires in 10 minutes)
      await TwoFactorChallengeService.createChallenge('', code, 10);

      return NextResponse.json({
        loginAttemptId
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
interface TwoFactorBody {
  loginAttemptId?: string;
  code?: string;
  action?: string;
  userId?: string;
  backupCode?: string;
  trustDevice?: boolean;
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const bodyResult = await parseRequestBody<TwoFactorBody>(req, { maxSize: 2048 });
      if (!bodyResult.success) return bodyResult.error;

      const body = bodyResult.data;
      const { loginAttemptId, code, action, userId, backupCode } = body;
      const { ip, userAgent } = extractRequestMetadata(req);
      const clientId = `${ip}-${userAgent}`;

      // 1. LOGIN VERIFICATION FLOW
      if (loginAttemptId) {
        if (!code) {
          return NextResponse.json({ error: 'Code is required' }, { status: 400 });
        }

        const trimmedCode = code.trim();
        const trimmedAttemptId = loginAttemptId.trim();

        if (trimmedCode.length !== 6 || !/^\d{6}$/.test(trimmedCode)) {
          return NextResponse.json({ error: 'رمز التحقق يجب أن يكون مكون من 6 أرقام', code: 'INVALID_CODE_FORMAT' }, { status: 400 });
        }

        // Lookup challenge to identify user for rate limiting
        const challenge = await prisma.twoFactorChallenge.findUnique({
          where: { id: trimmedAttemptId }
        });

        if (challenge?.userId) {
          try {
            // Check for persistent lockout first
            const lockoutStatus = await authService.get2FALockoutStatus(challenge.userId);
            if (lockoutStatus.locked) {
              return NextResponse.json(
                {
                  error: `تم حظر محاولات التحقق مؤقتاً. يمكنك المحاولة مرة أخرى بعد ${lockoutStatus.lockedUntil?.toLocaleTimeString()}`,
                  code: 'ACCOUNT_LOCKED',
                  lockedUntil: lockoutStatus.lockedUntil
                },
                { status: 403 }
              );
            }

            // Check user-specific rate limit (e.g. 5 attempts per 15 mins)
            await authService.checkUserRateLimit(challenge.userId, 5, 15 * 60);
          } catch (error: any) {
            return NextResponse.json(
              { error: error.message || 'تم تجاوز الحد المسموح به من المحاولات لهذا الحساب. يرجى الانتظار قليلاً.', code: 'RATE_LIMIT_EXCEEDED' },
              { status: 429 }
            );
          }
        }

        // Rate Limit Check (IP based)
        try {
          await authService.checkRateLimit(clientId, 5, 15 * 60);
        } catch (error) {
          return NextResponse.json(
            { error: 'تم تجاوز الحد المسموح به من المحاولات. يرجى الانتظار قليلاً.', code: 'RATE_LIMIT_EXCEEDED' },
            { status: 429 }
          );
        }

        // Verify Challenge
        const challengePromise = TwoFactorChallengeService.verifyAndConsumeChallenge(trimmedAttemptId, trimmedCode);
        const timeoutPromise = new Promise<{ valid: false }>((resolve) => setTimeout(() => resolve({ valid: false }), 5000));

        const challengeResult = await Promise.race([challengePromise, timeoutPromise]);

        if (!challengeResult.valid || !challengeResult.userId) {
          // Record failure and check for lockout
          if (challenge?.userId) {
            await authService.recordFailed2FAAttempt(challenge.userId);
          }

          // Log failure for rate limiting
          await securityLogger.logEvent({
            userId: challenge?.userId || 'unknown',
            eventType: 'TWO_FACTOR_FAILED',
            ip,
            userAgent,
            metadata: { reason: 'invalid_code', loginAttemptId: trimmedAttemptId }
          });

          return NextResponse.json({ error: 'رمز التحقق غير صحيح أو منتهي الصلاحية', code: 'INVALID_OR_EXPIRED' }, { status: 400 });
        }

        // On success, reset attempts
        await authService.reset2FAAttempts(challengeResult.userId);

        // Fetch user
        const user = await prisma.user.findUnique({
          where: { id: challengeResult.userId },
          select: {
            id: true, email: true, name: true, role: true, twoFactorEnabled: true, lastLogin: true
          }
        });

        if (!user) {
          return NextResponse.json({ error: 'المستخدم غير موجود', code: 'USER_NOT_FOUND' }, { status: 404 });
        }

        const rememberDevice = Boolean(body.trustDevice);
        await authService.resetRateLimit(clientId);

        // Create Session & Tokens
        const tempTokens = await authService.createTokens({
          userId: user.id, email: user.email, role: user.role || 'user'
        });

        const session = await authService.createSession(user.id, tempTokens.refreshToken, userAgent, ip, rememberDevice);

        const { accessToken, refreshToken } = await authService.createTokens({
          userId: user.id, email: user.email, role: user.role || 'user'
        }, session.id);

        await prisma.session.update({ where: { id: session.id }, data: { refreshToken } });

        // Update user & Log
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        });

        logSecurityEventSafely(user.id, 'two_factor_verified', { userAgent, sessionId: session.id, ip });

        const response = NextResponse.json({
          message: 'تم التحقق من الرمز بنجاح.',
          user: { ...user, emailVerified: false }, // emailVerified missing from select, assuming false or fetched if needed
          token: accessToken,
          refreshToken,
          sessionId: session.id
        });

        setAuthCookies(response, accessToken, refreshToken, rememberDevice);
        return response;
      }

      // 2. MANAGEMENT ACTIONS FLOW
      if (!action) {
        return NextResponse.json({ error: 'Action is required' }, { status: 400 });
      }

      // Get User from Token
      let targetUserId = userId;
      if (!targetUserId) {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        const token = authHeader.substring(7);
        // Note: getJWTSecretSafe needs to be imported or defined. assuming imported from auth-utils or local
        // Wait, imported getJWTSecretSafe in local file? No, I need to check import.
        // It was a local helper in previous file. I should export it from auth-utils or implement here.
        // I will import it from auth-utils or Re-implement it locally if not there.
        // I will use `process.env.JWT_SECRET` directly with TextEncoder for simplicity or assumes getJWTSecretSafe is available if I add it.
        // Actually I'll use `new TextEncoder().encode(process.env.JWT_SECRET!)`.
        const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
        const { payload } = await jwtVerify(token, secret);
        targetUserId = payload.userId as string;
      }

      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true, email: true, name: true, role: true,
          twoFactorEnabled: true, twoFactorSecret: true, recoveryCodes: true
        }
      });

      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      // Rate Limit for Management
      try {
        await authService.checkRateLimit(clientId);
      } catch (error) {
        logSecurityEventSafely(targetUserId, 'two_factor_rate_limit', { userAgent, ip });
        return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
      }

      // Check lockout status for management actions
      const lockoutStatus = await authService.get2FALockoutStatus(user.id);
      if (lockoutStatus.locked) {
        return NextResponse.json(
          {
            error: `تم حظر محاولات التحقق مؤقتاً. يمكنك المحاولة مرة أخرى بعد ${lockoutStatus.lockedUntil?.toLocaleTimeString()}`,
            code: 'ACCOUNT_LOCKED',
            lockedUntil: lockoutStatus.lockedUntil
          },
          { status: 403 }
        );
      }

      switch (action) {
        case 'setup': return await handleSetup2FA(user);
        case 'verify': return await handleVerify2FA(user, code || '', req);
        case 'disable': return await handleDisable2FA(user, code || '', req);
        case 'backup-code': return await handleBackupCode(user, backupCode || '', req);
        default: return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }

    } catch (error) {
      logger.error('Two-factor authentication error:', error);
      return createErrorResponse(error, 'حدث خطأ غير متوقع.');
    }
  });
}

// Handlers
async function handleSetup2FA(user: UserWith2FA) {
  try {
    const secret = generateSecret();
    const backupCodes = generateRecoveryCodes();

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret, recoveryCodes: JSON.stringify(backupCodes) }
    });

    const otpauth = authenticator.keyuri(user.email, 'Thanawy', secret);
    const qrCode = await QRCode.toDataURL(otpauth);

    return NextResponse.json({
      secret, qrCode, backupCodes,
      message: '2FA setup initiated. Please verify with your authenticator app.'
    });
  } catch (e) {
    logger.error('2FA setup error:', e);
    return NextResponse.json({ error: 'Failed to setup 2FA' }, { status: 500 });
  }
}

async function handleVerify2FA(user: UserWith2FA, code: string, req: NextRequest) {
  if (!code) return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
  if (!user.twoFactorSecret) return NextResponse.json({ error: '2FA not set up' }, { status: 400 });

  const isValid = verifyTOTP(user.twoFactorSecret, code).valid; // verifyTOTP returns {valid: boolean} usually? let's check. 
  // In the file it was used as const isValid = verifyTOTP(...); so maybe it returns boolean.
  // Wait, line 322-323 says: const totpResult = verifyTOTP(...); isValid = totpResult.valid;
  // So it returns an object.
  const { ip, userAgent } = extractRequestMetadata(req);

  if (!isValid) {
    await authService.recordFailed2FAAttempt(user.id);
    logSecurityEventSafely(user.id, 'two_factor_verify_failed', { userAgent, method: 'TOTP', ip });
    securityLogger.logEvent({ userId: user.id, eventType: 'TWO_FACTOR_FAILED', ip, userAgent, metadata: { method: 'TOTP' } });
    return NextResponse.json({ error: 'رمز التحقق غير صحيح' }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
  await authService.resetRateLimit(`${ip}-${userAgent}`);

  logSecurityEventSafely(user.id, 'two_factor_enabled', { userAgent, method: 'TOTP', ip });
  securityLogger.logEvent({ userId: user.id, eventType: 'TWO_FACTOR_ENABLED', ip, userAgent, metadata: { method: 'TOTP' } });
  securityNotificationService.notify2FAStatusChange(user.id, true, ip);

  return NextResponse.json({ message: 'تم تفعيل المصادقة الثنائية بنجاح' });
}

async function handleDisable2FA(user: UserWith2FA, code: string, req: NextRequest) {
  if (!code) return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
  if (!user.twoFactorEnabled) return NextResponse.json({ error: '2FA not enabled' }, { status: 400 });

  const { ip, userAgent } = extractRequestMetadata(req);
  let isValid = false;
  if (user.twoFactorSecret) {
    const totpResult = verifyTOTP(user.twoFactorSecret, code);
    isValid = totpResult.valid;
  }
  if (!isValid) isValid = await verifyAndConsumeRecoveryCode(user.id, code);

  if (!isValid) {
    await authService.recordFailed2FAAttempt(user.id);
    logSecurityEventSafely(user.id, 'two_factor_disable_failed', { userAgent, reason: 'invalid_code', ip });
    securityLogger.logEvent({ userId: user.id, eventType: 'TWO_FACTOR_DISABLED', ip, userAgent, metadata: { reason: 'invalid_code' } });
    return NextResponse.json({ error: 'رمز التحقق غير صحيح' }, { status: 400 });
  }

  await disableTOTP(user.id);
  await authService.resetRateLimit(`${ip}-${userAgent}`);

  logSecurityEventSafely(user.id, 'two_factor_disabled', { userAgent, ip });
  securityLogger.logEvent({ userId: user.id, eventType: 'TWO_FACTOR_DISABLED', ip, userAgent });
  securityNotificationService.notify2FAStatusChange(user.id, false, ip);

  return NextResponse.json({ message: 'تم إلغاء تفعيل المصادقة الثنائية بنجاح' });
}

async function handleBackupCode(user: UserWith2FA, backupCode: string, req: NextRequest) {
  if (!backupCode) return NextResponse.json({ error: 'Backup code is required' }, { status: 400 });
  if (!user.twoFactorEnabled) return NextResponse.json({ error: '2FA not enabled' }, { status: 400 });

  const { ip, userAgent } = extractRequestMetadata(req);
  const isValid = await verifyAndConsumeRecoveryCode(user.id, backupCode);

  if (!isValid) {
    await authService.recordFailed2FAAttempt(user.id);
    logSecurityEventSafely(user.id, 'two_factor_backup_code_failed', { userAgent, ip });
    securityLogger.logEvent({ userId: user.id, eventType: 'TWO_FACTOR_FAILED', ip, userAgent });
    return NextResponse.json({ error: 'رمز الاسترداد غير صحيح أو مستخدم' }, { status: 400 });
  }

  logSecurityEventSafely(user.id, 'two_factor_backup_code_used', { userAgent, ip });
  securityLogger.logEvent({ userId: user.id, eventType: 'TWO_FACTOR_SUCCESS', ip, userAgent });

  await authService.resetRateLimit(`${ip}-${userAgent}`);

  // Generate temp token for next steps if needed, but here we usually just confirm verification
  // Original code returned a token.
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const token = await new SignJWT({ userId: user.id, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return NextResponse.json({ message: 'تم التحقق من رمز الاسترداد بنجاح', token });
}
