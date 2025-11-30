import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { webAuthnService } from '@/lib/security/webauthn';
import { prisma } from '@/lib/prisma';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { getSecureCookieOptions, setAuthCookies } from '@/app/api/auth/_helpers';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json();

      // Check if this is a verification request (has credential)
      if (body.credential && body.challenge) {
        return handleVerification(req, body);
      }

      // Otherwise assume it's an options request (has email)
      if (body.email) {
        return handleOptions(req, body);
      }

      return NextResponse.json(
        { error: 'بيانات غير مكتملة' },
        { status: 400 }
      );
    } catch (error) {
      logger.error('Biometric API error:', error);
      return NextResponse.json(
        { error: 'حدث خطأ في الخادم' },
        { status: 500 }
      );
    }
  });
}

export async function PUT(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json();
      return handleVerification(req, body);
    } catch (error) {
      logger.error('Biometric verification error:', error);
      return NextResponse.json(
        { error: 'حدث خطأ أثناء التحقق' },
        { status: 500 }
      );
    }
  });
}

async function handleOptions(req: NextRequest, body: any) {
  const { email } = body;

  if (!email) {
    return NextResponse.json(
      { error: 'البريد الإلكتروني مطلوب' },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: 'المصادقة البيومترية غير مفعلة لهذا الحساب' },
      { status: 404 }
    );
  }

  const credentials = user.biometricCredentials as any[] || [];

  if (credentials.length === 0) {
    return NextResponse.json(
      { error: 'لا توجد بيانات اعتماد بيومترية' },
      { status: 404 }
    );
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

  return NextResponse.json({
    options,
  });
}

async function handleVerification(req: NextRequest, body: any) {
  const { credential, challenge, email } = body;

  if (!credential || !challenge) {
    return NextResponse.json(
      { error: 'بيانات غير مكتملة' },
      { status: 400 }
    );
  }

  // If email is not provided, we might need to look it up via challenge or credential
  // But for now let's require email or try to infer it if possible (not easy without email)
  // The client usually sends email with verify request if it knows it.
  
  if (!email) {
     return NextResponse.json(
      { error: 'البريد الإلكتروني مطلوب للتحقق' },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: 'المصادقة البيومترية غير مفعلة' },
      { status: 404 }
    );
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
    return NextResponse.json(
      { error: 'التحدي غير صالح أو منتهي الصلاحية' },
      { status: 400 }
    );
  }

  // Find matching credential
  const credentials = user.biometricCredentials as any[] || [];
  const matchingCredential = credentials.find(
    (cred) => cred.credentialId === credential.id
  );

  if (!matchingCredential) {
    return NextResponse.json(
      { error: 'بيانات الاعتماد غير صالحة' },
      { status: 400 }
    );
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

    return NextResponse.json(
      { error: 'فشل التحقق من المصادقة البيومترية' },
      { status: 400 }
    );
  }

  // Update counter
  if (verificationResult.newCounter !== undefined) {
    await prisma.biometricCredential.update({
      where: { id: matchingCredential.id },
      data: {
        counter: verificationResult.newCounter,
        // lastUsed is not in the schema currently, so we skip it or add it if needed. 
        // Schema showed: createdAt, updatedAt. No lastUsed.
        // If we want lastUsed, we need to add it to schema. For now, just update counter.
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
  const session = await authService.createSession(user.id, userAgent, ip);
  const { accessToken, refreshToken } = await authService.createTokens(
    {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
    },
    session.id
  );

  // Log security event
  await authService.logSecurityEvent(
    user.id,
    'biometric_login_success',
    ip,
    { userAgent, sessionId: session.id }
  );

  const response = NextResponse.json({
    message: 'تم تسجيل الدخول بنجاح',
    token: accessToken,
    refreshToken,
    sessionId: session.id,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });

  // Set cookies
  setAuthCookies(response, accessToken, refreshToken, true);

  return response;
}
