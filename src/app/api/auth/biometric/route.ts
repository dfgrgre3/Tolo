import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authService } from '@/lib/auth-service';
import { webAuthnService, WebAuthnCredential } from '@/lib/security/webauthn';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { setAuthCookies } from '@/app/api/auth/_helpers';
import crypto from 'crypto';

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
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          );
      }
    } catch (error) {
      logger.error('Biometric authentication error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

async function handleBiometricRegistration(
  request: NextRequest,
  data: { userId: string; response: any }
) {
  const { userId, response } = data;

  if (!userId || !response) {
    return NextResponse.json(
      { error: 'User ID and response are required' },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  // Get the registration challenge from database
  const challenge = await prisma.biometricChallenge.findFirst({
    where: {
      userId,
      type: 'register',
      used: false,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!challenge) {
    return NextResponse.json(
      { error: 'No active registration challenge found' },
      { status: 400 }
    );
  }

  // Verify registration response
  const verificationResult = await webAuthnService.verifyRegistration(
    response,
    challenge.challenge
  );

  if (!verificationResult.verified || !verificationResult.credential) {
    logger.error('Registration verification failed:', verificationResult.error);
    return NextResponse.json(
      { error: 'Registration verification failed' },
      { status: 400 }
    );
  }

  // Mark challenge as used
  await prisma.biometricChallenge.update({
    where: { id: challenge.id },
    data: { used: true }
  });

  // Save credential
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
    where: { id: userId },
    data: { biometricEnabled: true }
  });

  return NextResponse.json({
    success: true,
    message: 'Biometric registration successful'
  });
}

async function handleBiometricAuthentication(
  request: NextRequest,
  data: { response: any }
) {
  const { response } = data;

  if (!response) {
    return NextResponse.json(
      { error: 'Authentication response is required' },
      { status: 400 }
    );
  }

  const ip = authService.getClientIP(request);
  const userAgent = authService.getUserAgent(request);
  const clientId = `${ip}-${userAgent}`;

  // Find credential
  const credential = await prisma.biometricCredential.findUnique({
    where: { credentialId: response.id },
    include: { user: true }
  });

  if (!credential || !credential.user) {
    return NextResponse.json(
      { error: 'Credential not found' },
      { status: 404 }
    );
  }

  const user = credential.user;

  if (!user.biometricEnabled) {
    return NextResponse.json(
      { error: 'Biometric authentication is not enabled for this account' },
      { status: 401 }
    );
  }

  // Get the authentication challenge
  const challenge = await prisma.biometricChallenge.findFirst({
    where: {
      userId: user.id,
      type: 'authenticate',
      used: false,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!challenge) {
    return NextResponse.json(
      { error: 'No active authentication challenge found' },
      { status: 400 }
    );
  }

  // Map to WebAuthnCredential
  const webAuthnCred: WebAuthnCredential = {
    id: credential.id,
    userId: credential.userId,
    credentialId: credential.credentialId,
    publicKey: credential.publicKey,
    counter: credential.counter,
    deviceType: credential.deviceType || 'unknown',
    transports: credential.transports as any[],
    createdAt: credential.createdAt,
  };

  // Verify authentication response
  const verificationResult = await webAuthnService.verifyAuthentication(
    response,
    challenge.challenge,
    webAuthnCred
  );

  if (!verificationResult.verified) {
    logger.error('Authentication verification failed:', verificationResult.error);
    return NextResponse.json(
      { error: 'Authentication verification failed' },
      { status: 400 }
    );
  }

  // Mark challenge as used
  await prisma.biometricChallenge.update({
    where: { id: challenge.id },
    data: { used: true }
  });

  // Update credential counter
  if (verificationResult.newCounter !== undefined) {
    await prisma.biometricCredential.update({
      where: { id: credential.id },
      data: {
        counter: verificationResult.newCounter
      }
    });
  }

  // Create tokens first to get a refresh token
  const tempTokens = await authService.createTokens({
    id: user.id,
    email: user.email,
    name: user.name || undefined,
  });

  // Create session
  const session = await authService.createSession(user.id, userAgent, ip, tempTokens.refreshToken);

  // Reset rate limiting
  await authService.resetRateLimit(clientId);

  // Update last login
  await authService.updateLastLogin(user.id);

  // Create tokens
  const tokensResult = await authService.createTokens(
    {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role || undefined,
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
    return NextResponse.json(
      { error: 'Invalid action. Must be "register" or "login"' },
      { status: 400 }
    );
  }

  let options;
  let targetUserId = userId;

  if (action === 'register') {
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required for registration' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
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

  return NextResponse.json({
    success: true,
    options,
    challenge: challenge.id // Return challenge ID if client needs it
  });
}
