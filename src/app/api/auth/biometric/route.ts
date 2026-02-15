import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authService } from '@/lib/services/auth-service';
import { webAuthnService, WebAuthnCredential } from '@/lib/security/webauthn';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import {
  setAuthCookies,
  createErrorResponse,
  createSuccessResponse,
} from '@/app/api/auth/_helpers';
import { withDatabaseRetry } from '@/lib/auth-utils';
import { authChallengeService } from '@/lib/services/auth-challenges-service';
import crypto from 'crypto';

/**
 * POST /api/auth/biometric
 * المصادقة البيومترية - التسجيل والتحقق
 */
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { action, ...data } = await req.json();

      logger.info(`Biometric API request: ${action}`, { ip: req.headers.get('x-forwarded-for') });

      switch (action) {
        case 'register':
          return handleBiometricRegistration(req, data);
        case 'authenticate':
          return handleBiometricAuthentication(req, data);
        case 'options':
          return handleAuthenticationOptions(req, data);
        default:
          logger.warn(`Invalid biometric action: ${action}`);
          return createErrorResponse(
            { error: 'Invalid action', code: 'INVALID_ACTION' },
            'إجراء غير صحيح',
            400
          );
      }
    } catch (error: unknown) {
      logger.error('Biometric authentication error:', error);
      return createErrorResponse(error, 'حدث خطأ في المصادقة البيومترية', 500);
    }
  });
}

/**
 * Handle Biometric Registration
 */
async function handleBiometricRegistration(
  request: NextRequest,
  data: { userId: string; response: any }
) {
  const { userId, response } = data;

  if (!userId || !response) {
    return createErrorResponse(
      { error: 'Missing data', code: 'MISSING_DATA' },
      'معرف المستخدم والاستجابة مطلوبان',
      400
    );
  }

  // Find user with retry
  const user = await withDatabaseRetry(
    async () => prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true }
    }),
    { maxAttempts: 3, operationName: 'find user for biometric registration' }
  );

  if (!user) {
    return createErrorResponse(
      { error: 'User not found', code: 'USER_NOT_FOUND' },
      'المستخدم غير موجود',
      404
    );
  }

  // Get the registration challenge from database with retry
  const challenge = await withDatabaseRetry(
    async () => prisma.biometricChallenge.findFirst({
      where: {
        userId,
        type: 'register',
        used: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    }),
    { maxAttempts: 3, operationName: 'find biometric registration challenge' }
  );

  if (!challenge) {
    return createErrorResponse(
      { error: 'No challenge found', code: 'NO_CHALLENGE' },
      'لم يتم العثور على تحدي تسجيل نشط',
      400
    );
  }

  // Verify registration response
  const verificationResult = await webAuthnService.verifyRegistration(
    response,
    challenge.challenge
  );

  if (!verificationResult.verified || !verificationResult.credential) {
    logger.error('Registration verification failed:', verificationResult.error);
    return createErrorResponse(
      { error: 'Verification failed', code: 'VERIFICATION_FAILED' },
      'فشل التحقق من التسجيل',
      400
    );
  }

  // Mark challenge as used
  await withDatabaseRetry(
    async () => prisma.biometricChallenge.update({
      where: { id: challenge.id },
      data: { used: true }
    }),
    { maxAttempts: 3, operationName: 'mark challenge as used' }
  );

  // Save credential
  await withDatabaseRetry(
    async () => prisma.biometricCredential.create({
      data: {
        userId: user.id,
        credentialId: verificationResult.credential!.credentialId,
        publicKey: verificationResult.credential!.publicKey,
        counter: verificationResult.credential!.counter,
        transports: JSON.stringify([]),
        deviceType: 'singleDevice',
      }
    }),
    { maxAttempts: 3, operationName: 'save biometric credential' }
  );

  await withDatabaseRetry(
    async () => prisma.user.update({
      where: { id: userId },
      data: { biometricEnabled: true }
    }),
    { maxAttempts: 3, operationName: 'enable biometric for user' }
  );

  logger.info('Biometric registration completed', { userId });

  return createSuccessResponse({
    message: 'تم تسجيل المصادقة البيومترية بنجاح'
  });
}

async function handleBiometricAuthentication(
  request: NextRequest,
  data: { response: any }
) {
  const { response } = data;

  if (!response) {
    return createErrorResponse(
      { error: 'Response required', code: 'MISSING_RESPONSE' },
      'استجابة المصادقة مطلوبة',
      400
    );
  }

  const ip = authService.getClientIP(request);
  const userAgent = authService.getUserAgent(request);
  const clientId = `${ip}-${userAgent}`;

  // 1. Check Rate Limit
  try {
    await authService.checkRateLimit(clientId);
  } catch (error) {
    await authService.logSecurityEvent('unknown', 'biometric_rate_limit_exceeded', ip, { userAgent });
    return createErrorResponse(
      { error: 'Rate limited', code: 'RATE_LIMITED' },
      'محاولات كثيرة جداً. يرجى المحاولة لاحقاً.',
      429
    );
  }

  // Find credential
  const credential = await prisma.biometricCredential.findUnique({
    where: { credentialId: response.id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          biometricEnabled: true
        }
      }
    }
  });

  if (!credential || !credential.user) {
    await authService.recordFailedAttempt(clientId);
    return createErrorResponse(
      { error: 'Credential not found', code: 'CREDENTIAL_NOT_FOUND' },
      'بيانات الاعتماد غير موجودة',
      404
    );
  }

  const user = credential.user;

  if (!user.biometricEnabled) {
    return createErrorResponse(
      { error: 'Biometric not enabled', code: 'BIOMETRIC_NOT_ENABLED' },
      'المصادقة البيومترية غير مفعلة لهذا الحساب',
      401
    );
  }

  // 2. Extract challenge from client response to find the CORRECT challenge record
  // This prevents race conditions where we might verify against the wrong challenge
  let clientChallenge = '';
  try {
    const clientData = JSON.parse(Buffer.from(response.clientDataJSON, 'base64').toString('utf8'));
    clientChallenge = clientData.challenge;
  } catch (e) {
    await authService.recordFailedAttempt(clientId);
    return createErrorResponse(
      { error: 'Invalid client data', code: 'INVALID_CLIENT_DATA' },
      'بيانات العميل غير صحيحة',
      400
    );
  }

  // Debug log
  logger.debug(`Biometric Auth: Looking for challenge ${clientChallenge} for user ${user.id}`);

  // 3. Find specific challenge by VALUE (secure lookup)
  const challenge = await prisma.biometricChallenge.findFirst({
    where: {
      challenge: clientChallenge,
      userId: user.id,
      type: 'authenticate',
      used: false,
      expiresAt: { gt: new Date() }
    }
  });

  if (!challenge) {
    await authService.recordFailedAttempt(clientId);
    await authService.logSecurityEvent(user.id, 'biometric_challenge_not_found', ip, { userAgent });
    return createErrorResponse(
      { error: 'Challenge expired', code: 'CHALLENGE_EXPIRED' },
      'جلسة تسجيل الدخول غير صالحة أو منتهية الصلاحية',
      400
    );
  }

  // 4. Verify using Centralized Service
  // Note: We use the service to handle the complex verification logic logic consistently
  const verification = await authChallengeService.verifyBiometricChallenge(
    challenge.id,
    clientChallenge,
    user.id
  );

  if (!verification.valid) {
    await authService.recordFailedAttempt(clientId);
    await authService.logSecurityEvent(user.id, 'biometric_verification_failed', ip, { userAgent });
    return createErrorResponse(
      { error: 'Verification failed', code: 'VERIFICATION_FAILED' },
      'فشل التحقق من المصادقة',
      400
    );
  }

  // Map to WebAuthnCredential for strict signature verification
  const webAuthnCred: WebAuthnCredential = {
    id: credential.id,
    userId: credential.userId,
    credentialId: credential.credentialId,
    publicKey: credential.publicKey,
    counter: credential.counter,
    deviceType: credential.deviceType || 'unknown',
    transports: JSON.parse(credential.transports || '[]'),
    createdAt: credential.createdAt,
  };

  // 5. Verify Cryptographic Signature (WebAuthn)
  const signatureVerification = await webAuthnService.verifyAuthentication(
    response,
    challenge.challenge,
    webAuthnCred
  );

  if (!signatureVerification.verified) {
    await authService.recordFailedAttempt(clientId);
    logger.error('Authentication signature verification failed:', signatureVerification.error);
    return createErrorResponse(
      { error: 'Signature failed', code: 'SIGNATURE_FAILED' },
      'فشل التحقق من التوقيع',
      400
    );
  }

  // Update credential counter
  if (signatureVerification.newCounter !== undefined) {
    await prisma.biometricCredential.update({
      where: { id: credential.id },
      data: {
        counter: signatureVerification.newCounter
      }
    });
  }

  // Create tokens first to get a refresh token
  const tempTokens = await authService.createTokens({
    userId: user.id,
    email: user.email,
    name: user.name || undefined,
    role: user.role || 'user',
  });

  // Create session
  const session = await authService.createSession(user.id, tempTokens.refreshToken, userAgent, ip);

  // Reset rate limiting
  await authService.resetRateLimit(clientId);

  // Update last login
  await authService.updateLastLogin(user.id);

  // Create tokens
  const tokensResult = await authService.createTokens(
    {
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role || 'user',
    },
    session.id
  );

  // Update session with final refresh token
  await prisma.session.update({
    where: { id: session.id },
    data: { refreshToken: tokensResult.refreshToken }
  });

  // Log security event
  await authService.logSecurityEvent(
    user.id,
    'biometric_login_success',
    ip,
    { userAgent, sessionId: session.id, credentialId: credential.credentialId }
  );

  const responseObj = NextResponse.json({
    message: 'Biometric authentication successful',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    token: tokensResult.accessToken,
    refreshToken: tokensResult.refreshToken
  });

  setAuthCookies(responseObj, tokensResult.accessToken, tokensResult.refreshToken, true);

  return responseObj;
}

async function handleAuthenticationOptions(
  request: NextRequest,
  data: { userId?: string; action: 'register' | 'login' }
) {
  const { userId, action } = data;

  if (!action || !['register', 'login'].includes(action)) {
    return createErrorResponse(
      { error: 'Invalid action', code: 'INVALID_ACTION' },
      'إجراء غير صحيح. يجب أن يكون "register" أو "login"',
      400
    );
  }

  let options;
  let targetUserId = userId;

  if (action === 'register') {
    if (!userId) {
      return createErrorResponse(
        { error: 'Missing user ID', code: 'MISSING_USER_ID' },
        'معرف المستخدم مطلوب للتسجيل',
        400
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return createErrorResponse(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        'المستخدم غير موجود',
        404
      );
    }

    options = webAuthnService.generateRegistrationOptions({
      id: user.id,
      email: user.email,
      name: user.name || undefined,
    });
  } else {
    // Login options
    options = webAuthnService.generateAuthenticationOptions();
  }

  // Store challenge in database
  const challenge = await prisma.biometricChallenge.create({
    data: {
      id: crypto.randomUUID(),
      challenge: options.challenge,
      type: action === 'login' ? 'authenticate' : 'register',
      userId: targetUserId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    }
  });

  return createSuccessResponse({
    options,
    challengeId: challenge.id
  });
}
