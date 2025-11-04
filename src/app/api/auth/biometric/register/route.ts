import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { webAuthnService } from '@/lib/security/webauthn';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const verification = await authService.verifyTokenFromRequest(request);
    
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

    // Store challenge temporarily (in production, use Redis or similar)
    // For now, we'll store in BiometricChallenge table
    await prisma.biometricChallenge.create({
      data: {
        challenge: options.challenge,
        type: 'register',
        userId: user.id,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        used: false,
      },
    });

    return NextResponse.json({
      options,
    });

  } catch (error) {
    console.error('Failed to generate biometric registration options:', error);
    return NextResponse.json(
      { error: 'فشل إنشاء خيارات التسجيل البيومتري' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const verification = await authService.verifyTokenFromRequest(request);
    
    if (!verification.isValid || !verification.user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const user = verification.user;
    const body = await request.json();
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
    const existingCredentials = await prisma.user.findUnique({
      where: { id: user.id },
      select: { biometricCredentials: true },
    });

    const credentials = existingCredentials?.biometricCredentials as any[] || [];
    credentials.push({
      id: crypto.randomUUID(),
      credentialId: verificationResult.credential.credentialId,
      publicKey: verificationResult.credential.publicKey,
      counter: verificationResult.credential.counter,
      createdAt: new Date().toISOString(),
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        biometricEnabled: true,
        biometricCredentials: credentials,
      },
    });

    // Mark challenge as used
    await prisma.biometricChallenge.update({
      where: { id: storedChallenge.id },
      data: { used: true },
    });

    // Log security event
    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);
    await authService.logSecurityEvent(
      user.id,
      'biometric_registered',
      ip,
      { userAgent }
    );

    return NextResponse.json({
      message: 'تم تفعيل المصادقة البيومترية بنجاح',
      biometricEnabled: true,
    });

  } catch (error) {
    console.error('Failed to register biometric:', error);
    return NextResponse.json(
      { error: 'فشل تسجيل المصادقة البيومترية' },
      { status: 500 }
    );
  }
}

