import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { webAuthnService } from '@/lib/security/webauthn';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import {
  getSecureCookieOptions,
  setAuthCookies,
  createErrorResponse,
  createSuccessResponse
} from '@/app/api/auth/_helpers';
import crypto from 'crypto';

interface BiometricAuthBody {
  email?: string;
  credential?: any;
  challenge?: string;
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json() as BiometricAuthBody;

      // Check if this is a verification request (has credential)
      if (body.credential && body.challenge) {
        return handleVerification(req, body);
      }

      // Otherwise assume it's an options request (has email)
      if (body.email) {
        return handleOptions(req, body);
      }

      return createErrorResponse('بيانات غير مكتملة', 'بيانات غير مكتملة', 400);
    } catch (error) {
      logger.error('Biometric API error:', error);
      return createErrorResponse(error, 'حدث خطأ في الخادم', 500);
    }
  });
}

export async function PUT(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json() as BiometricAuthBody;
      return handleVerification(req, body);
    } catch (error) {
      logger.error('Biometric verification error:', error);
      return createErrorResponse(error, 'حدث خطأ أثناء التحقق', 500);
    }
  });
}

async function handleOptions(req: NextRequest, body: BiometricAuthBody) {
  const { email } = body;

  if (!email) {
    return createErrorResponse('البريد الإلكتروني مطلوب', 'البريد الإلكتروني مطلوب', 400);
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      email: true,
      name: true,
      biometricEnabled: true,
      biometricCredentials: true,
    },
  });

  if (!user || !user.biometricEnabled) {
    return createErrorResponse('المصادقة البيومترية غير مفعلة لهذا الحساب', 'المصادقة البيومترية غير مفعلة لهذا الحساب', 404);
  }

  const credentials = user.biometricCredentials || [];

  if (credentials.length === 0) {
    return createErrorResponse('لا توجد بيانات اعتماد بيومترية', 'لا توجد بيانات اعتماد بيومترية', 404);
  }

  // Generate authentication options
  const options = webAuthnService.generateAuthenticationOptions(
    credentials.map((cred) => ({
      id: cred.id,
      userId: user.id,
      credentialId: cred.credentialId,
      publicKey: cred.publicKey,
      counter: cred.counter,
      deviceType: cred.deviceType || 'unknown',
      createdAt: new Date(cred.createdAt),
    }))
  );

  // Store challenge temporarily
  await prisma.biometricChallenge.create({
    data: {
      id: crypto.randomUUID(),
      challenge: options.challenge,
      type: 'authenticate',
      userId: user.id,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      used: false,
    },
  });

  // Log security event
  const ip = authService.getClientIP(req);
  const userAgent = authService.getUserAgent(req);
  await authService.logSecurityEvent(user.id, 'biometric_authentication_initiated', ip, {
    userAgent,
  }).catch(() => {
    // Non-blocking log failure
  });

  return createSuccessResponse({ options });
}

async function handleVerification(req: NextRequest, body: BiometricAuthBody) {
  const { credential, challenge, email } = body;

  if (!credential || !challenge) {
    return createErrorResponse('بيانات غير مكتملة', 'بيانات غير مكتملة', 400);
  }

  if (!email) {
    return createErrorResponse('البريد الإلكتروني مطلوب للتحقق', 'البريد الإلكتروني مطلوب للتحقق', 400);
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      email: true,
      name: true,
      biometricEnabled: true,
      biometricCredentials: true,
    },
  });

  if (!user || !user.biometricEnabled) {
    return createErrorResponse('المصادقة البيومترية غير مفعلة', 'المصادقة البيومترية غير مفعلة', 404);
  }

  // Verify challenge
  const storedChallenge = await prisma.biometricChallenge.findFirst({
    where: {
      challenge,
      userId: user.id,
      type: 'authenticate',
      used: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!storedChallenge) {
    return createErrorResponse('الحالة غير صالحة', 'الحالة غير صالحة', 400);
  }

  // Find matching credential
  const credentials = user.biometricCredentials || [];
  const matchingCredential = credentials.find(
    (cred) => cred.credentialId === credential.id
  );

  if (!matchingCredential) {
    return createErrorResponse('بيانات الاعتماد غير صالحة', 'بيانات الاعتماد غير صالحة', 400);
  }

  // Verify authentication response
  const verificationResult = await webAuthnService.verifyAuthentication(
    credential,
    challenge,
    {
      id: matchingCredential.id,
      userId: user.id,
      credentialId: matchingCredential.credentialId,
      publicKey: matchingCredential.publicKey,
      counter: matchingCredential.counter,
      deviceType: matchingCredential.deviceType || 'unknown',
      createdAt: new Date(matchingCredential.createdAt),
    }
  );

  if (!verificationResult.verified) {
    // Log failed authentication attempt
    const ip = authService.getClientIP(req);
    const userAgent = authService.getUserAgent(req);
    await authService.logSecurityEvent(user.id, 'biometric_authentication_failed', ip, {
      userAgent,
    }).catch(() => {
      // Non-blocking log failure
    });

    return createErrorResponse('فشل التحقق من المصادقة البيومترية', 'فشل التحقق من المصادقة البيومترية', 400);
  }

  // Update counter
  if (verificationResult.newCounter !== undefined) {
    await prisma.biometricCredential.update({
      where: { id: matchingCredential.id },
      data: {
        counter: verificationResult.newCounter,
      },
    });
  }

  // Mark challenge as used
  await prisma.biometricChallenge.update({
    where: { id: storedChallenge.id },
    data: { used: true },
  });

  // Create session and tokens
  const ip = authService.getClientIP(req);
  const userAgent = authService.getUserAgent(req);

  await authService.updateLastLogin(user.id);

  // Create tokens first to get a refresh token
  const tempTokens = await authService.createTokens({
    id: user.id,
    email: user.email,
    name: user.name || undefined,
  });

  // Create session with the refresh token
  const session = await authService.createSession(user.id, userAgent, ip, tempTokens.refreshToken);

  // Create final tokens with session ID
  const { accessToken, refreshToken } = await authService.createTokens(
    {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
    },
    session.id
  );

  // Update session with final refresh token
  await prisma.session.update({
    where: { id: session.id },
    data: { refreshToken }
  });

  // Log security event
  await authService.logSecurityEvent(
    user.id,
    'biometric_login_success',
    ip,
    { userAgent, sessionId: session.id }
  );

  const response = createSuccessResponse({
    token: accessToken,
    refreshToken,
    sessionId: session.id,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  }, 'تم تسجيل الدخول بنجاح');

  // Set cookies
  setAuthCookies(response, accessToken, refreshToken, true);

  return response;
}
