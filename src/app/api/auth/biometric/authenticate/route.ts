import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { webAuthnService } from '@/lib/security/webauthn';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
        challenge: options.challenge,
        type: 'authenticate',
        userId: user.id,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        used: false,
      },
    });

    return NextResponse.json({
      options,
    });

  } catch (error) {
    console.error('Failed to generate biometric authentication options:', error);
    return NextResponse.json(
      { error: 'فشل إنشاء خيارات المصادقة البيومترية' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential, challenge, email } = body;

    if (!credential || !challenge || !email) {
      return NextResponse.json(
        { error: 'بيانات غير مكتملة' },
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
      return NextResponse.json(
        { error: 'فشل التحقق من المصادقة البيومترية' },
        { status: 400 }
      );
    }

    // Update counter
    if (verificationResult.newCounter !== undefined) {
      const updatedCredentials = credentials.map((cred) =>
        cred.id === matchingCredential.id
          ? { ...cred, counter: verificationResult.newCounter, lastUsed: new Date().toISOString() }
          : cred
      );

      await prisma.user.update({
        where: { id: user.id },
        data: {
          biometricCredentials: updatedCredentials,
        },
      });
    }

    // Mark challenge as used
    await prisma.biometricChallenge.update({
      where: { id: storedChallenge.id },
      data: { used: true },
    });

    // Create session and tokens
    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);
    
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
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Failed to authenticate with biometric:', error);
    return NextResponse.json(
      { error: 'فشل المصادقة البيومترية' },
      { status: 500 }
    );
  }
}

