import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { webAuthnService } from '@/lib/security/webauthn';
import { prisma } from '@/lib/prisma';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import crypto from 'crypto';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json();

      // If credential is provided, it's a registration verification
      if (body.credential) {
        return handleRegistration(req, body);
      }

      // Otherwise, it's a request for options
      return handleOptions(req);
    } catch (error) {
      logger.error('Biometric registration error:', error);
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
      return handleRegistration(req, body);
    } catch (error) {
      logger.error('Biometric registration error:', error);
      return NextResponse.json(
        { error: 'حدث خطأ في الخادم' },
        { status: 500 }
      );
    }
  });
}

async function handleOptions(req: NextRequest) {
  // Verify authentication
  const verification = await authService.verifyTokenFromRequest(req);

  if (!verification.isValid || !verification.user) {
    return NextResponse.json(
      { error: 'غير مصرح' },
      { status: 401 }
    );
  }

  const user = verification.user;

  // Get user details
  const userDetails = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (!userDetails) {
    return NextResponse.json(
      { error: 'المستخدم غير موجود' },
      { status: 404 }
    );
  }

  // Generate registration options
  const options = webAuthnService.generateRegistrationOptions({
    id: userDetails.id,
    email: userDetails.email,
    name: userDetails.name || undefined,
  });

  // Store challenge temporarily
  await prisma.biometricChallenge.create({
    data: {
      id: crypto.randomUUID(),
      challenge: options.challenge,
      type: 'register',
      userId: user.id,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      used: false,
    },
  });

  // Log security event
  const ip = authService.getClientIP(req);
  const userAgent = authService.getUserAgent(req);
  await authService.logSecurityEvent(user.id, 'biometric_registration_initiated', ip, {
    userAgent,
  }).catch(() => {
    // Non-blocking log failure
  });

  return NextResponse.json({
    options,
  });
}

async function handleRegistration(req: NextRequest, body: any) {
  // Verify authentication
  const verification = await authService.verifyTokenFromRequest(req);

  if (!verification.isValid || !verification.user) {
    return NextResponse.json(
      { error: 'غير مصرح' },
      { status: 401 }
    );
  }

  const user = verification.user;
  const { credential, challenge } = body;

  if (!credential || !challenge) {
    return NextResponse.json(
      { error: 'بيانات غير مكتملة' },
      { status: 400 }
    );
  }

  // Verify challenge exists and hasn't been used
  const storedChallenge = await prisma.biometricChallenge.findFirst({
    where: {
      challenge,
      userId: user.id,
      type: 'register',
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

  // Verify registration response
  const verificationResult = await webAuthnService.verifyRegistration(
    credential,
    challenge
  );

  if (!verificationResult.verified || !verificationResult.credential) {
    return NextResponse.json(
      { error: 'فشل التحقق من المصادقة البيومترية' },
      { status: 400 }
    );
  }

  // Store credential
  await prisma.biometricCredential.create({
    data: {
      userId: user.id,
      credentialId: verificationResult.credential.credentialId,
      publicKey: verificationResult.credential.publicKey,
      counter: verificationResult.credential.counter,
      transports: [], // Default empty
      deviceType: 'singleDevice', // Default
    }
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      biometricEnabled: true,
    },
  });

  // Mark challenge as used
  await prisma.biometricChallenge.update({
    where: { id: storedChallenge.id },
    data: { used: true },
  });

  // Log security event
  const ip = authService.getClientIP(req);
  const userAgent = authService.getUserAgent(req);
  await authService.logSecurityEvent(
    user.id,
    'biometric_registered',
    ip,
    { userAgent }
  );

  return NextResponse.json({
    message: 'تم تفعيل المصادقة البيومترية بنجاح',
    biometricEnabled: true,
    credentialId: verificationResult.credential.credentialId,
  });
}
